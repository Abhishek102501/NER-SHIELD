"""Training entry points for the two XGBoost models.

``python -m ne_rainfall.train_xgb --model rainfall``
``python -m ne_rainfall.train_xgb --model landslide --data-root data/raw/landslide4sense``

The rainfall trainer reuses the exact split, scaler and windowing that the LSTM
trainer uses, so the two models are scored on identical test windows and the
comparison in ``reports/`` is apples-to-apples.  It additionally carves a
validation slice out of the *end of the training split* for early stopping --
never out of the test split, which would leak.
"""

from __future__ import annotations

import argparse
import json
import time
from dataclasses import asdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from ne_rainfall.config import Config, load_config
from ne_rainfall.dataset_preparation import load_matrix
from ne_rainfall.features.tabular import TabularFeatureBuilder
from ne_rainfall.preprocess import Scaler, chronological_split, make_windows
from ne_rainfall.stations import load_stations


# --------------------------------------------------------------------------
# rainfall
# --------------------------------------------------------------------------
def _window_timestamps(cfg: Config, n_rows: int, n_windows: int, offset: int):
    """Timestamps of the last input step of each window, when the index exists."""
    import pandas as pd

    csv = cfg.path_for("processed_dir") / f"{cfg.slug}_features.csv"
    if not csv.exists():
        return None
    try:
        # The matrix CSV has a two-row MultiIndex header (block, station), and
        # pandas refuses `usecols` alongside one -- so skip those two rows and
        # read the bare index column. Reading the whole 111-column frame just
        # to get its index would cost far more than the features are worth.
        raw = pd.read_csv(csv, skiprows=2, usecols=[0], header=None).iloc[:, 0]
        idx = pd.DatetimeIndex(pd.to_datetime(raw))
    except Exception as exc:
        import warnings

        warnings.warn(
            f"could not read timestamps from {csv} ({exc}); the cyclical time "
            "features will be omitted. The model still trains, with slightly "
            "less information.",
            RuntimeWarning,
        )
        return None
    if len(idx) != n_rows:
        import warnings

        warnings.warn(
            f"{csv} has {len(idx)} rows but the matrix has {n_rows}; skipping "
            "time features rather than risk misaligning them.",
            RuntimeWarning,
        )
        return None
    start = offset + cfg.n_steps_in - 1
    return idx[start : start + n_windows]


def build_features(
    cfg: Config,
    data: np.ndarray,
    mode: str = "summary",
    verbose: bool = True,
) -> Dict[str, Any]:
    """Split, scale, window and tabularise -- mirroring the LSTM pipeline."""
    stations = load_stations(cfg.stations_path).reordered_with_target_first(
        cfg.model["target_station"]
    )
    pp = cfg.preprocess
    train_raw, test_raw = chronological_split(
        np.asarray(data, dtype=np.float64), float(cfg.windowing["train_split"])
    )
    scaler = Scaler(
        transform=pp.get("transform", "log1p"),
        method=pp.get("scaler", "minmax"),
        clip_quantile=pp.get("clip_quantile"),
    ).fit(train_raw)

    train = scaler.transform_array(train_raw)
    test = scaler.transform_array(test_raw)

    x_tr_w, y_tr = make_windows(train, cfg.n_steps_in, cfg.n_steps_out, 0)
    x_te_w, y_te = make_windows(test, cfg.n_steps_in, cfg.n_steps_out, 0)

    builder = TabularFeatureBuilder(
        stations=stations.names,
        blocks=cfg.blocks,
        mode=mode,
        station_lat=[s.lat for s in stations],
        station_lon=[s.lon for s in stations],
        station_elev=[s.elevation_m for s in stations],
    )
    ts_tr = _window_timestamps(cfg, len(data), len(x_tr_w), 0)
    ts_te = _window_timestamps(cfg, len(data), len(x_te_w), len(train_raw))

    x_tr = builder.transform(x_tr_w, timestamps=ts_tr)
    names = builder.feature_names
    x_te = builder.transform(x_te_w, timestamps=ts_te)

    if verbose:
        print(
            f"features: {x_tr.shape[1]} predictors "
            f"({mode} mode) | train {x_tr.shape[0]} / test {x_te.shape[0]} windows"
        )
    return {
        "x_train": x_tr, "y_train": y_tr,
        "x_test": x_te, "y_test": y_te,
        "scaler": scaler, "feature_names": names,
        "stations": stations, "mode": mode,
        "has_timestamps": ts_tr is not None,
        # Last target-column step of each test window, for the persistence
        # baseline -- the tabular matrix no longer carries it positionally.
        "x_test_last_observed": x_te_w[:, -1, 0].copy(),
    }


def train_rainfall(
    cfg: Optional[Config] = None,
    mode: str = "summary",
    val_fraction: float = 0.15,
    fit_classifiers: bool = True,
    verbose: bool = True,
) -> Dict[str, Any]:
    from ne_rainfall.evaluate import evaluate
    from ne_rainfall.models.xgb_rainfall import XGBRainfallModel
    from ne_rainfall.risk.thresholds import WARNING_THRESHOLDS

    cfg = cfg or load_config()
    data = load_matrix(cfg)
    prep = build_features(cfg, data, mode=mode, verbose=verbose)

    x_tr, y_tr = prep["x_train"], prep["y_train"]
    n_val = max(1, int(len(x_tr) * val_fraction))
    x_fit, y_fit = x_tr[:-n_val], y_tr[:-n_val]
    x_val, y_val = x_tr[-n_val:], y_tr[-n_val:]
    if verbose:
        print(
            f"early-stopping validation: last {n_val} training windows "
            "(held out from training, never from test)"
        )

    params = dict(cfg.model.get("xgboost", {}).get("params", {}))
    model = XGBRainfallModel(
        n_steps_out=cfg.n_steps_out,
        params={**__import__("ne_rainfall.models.xgb_rainfall", fromlist=["x"]).DEFAULT_PARAMS, **params},
        early_stopping_rounds=int(
            cfg.model.get("xgboost", {}).get("early_stopping_rounds", 50)
        ),
        feature_names=prep["feature_names"],
    )

    t0 = time.time()
    if verbose:
        print(f"\ntraining {cfg.n_steps_out} horizon regressors...")
    model.fit(x_fit, y_fit, eval_set=(x_val, y_val), verbose=verbose)
    took = time.time() - t0

    if fit_classifiers:
        if verbose:
            print("\nfitting IMD exceedance heads...")
        scaler: Scaler = prep["scaler"]
        y_fit_mm = np.stack(
            [scaler.inverse(y_fit[:, h], 0) for h in range(y_fit.shape[1])], axis=1
        )
        y_val_mm = np.stack(
            [scaler.inverse(y_val[:, h], 0) for h in range(y_val.shape[1])], axis=1
        )
        # Only thresholds that actually occur in this record are worth fitting.
        present = [t for t in WARNING_THRESHOLDS if (y_fit_mm >= t).any()]
        skipped = [t for t in WARNING_THRESHOLDS if t not in present]
        if verbose and skipped:
            print(
                f"  thresholds with no training events, skipped: "
                f"{', '.join(f'{t:g}mm' for t in skipped)}"
            )
        model.fit_classifiers(
            x_fit, y_fit_mm, thresholds=present,
            eval_set=(x_val, y_val_mm), verbose=verbose,
        )

    predicted = model.predict(prep["x_test"])
    report = evaluate(
        predicted=predicted,
        y_true=prep["y_test"],
        scaler=prep["scaler"],
        lead_times=cfg.lead_times,
        region=cfg.region["name"],
        model_name="xgb_rainfall",
        thresholds_mm=cfg.evaluate.get("thresholds_mm"),
        # The tabular features are not the raw window, so the persistence
        # baseline takes the target station's last observed step directly.
        last_observed=prep["x_test_last_observed"],
    )
    if verbose:
        print(f"\ntrained in {took:.1f}s\n")
        print(report.summary())
        print("\ntop predictors (mean gain across horizons):")
        for name, gain in model.feature_importance(top=12):
            print(f"  {gain:10.2f}  {name}")

    return {
        "arch": "xgb_rainfall",
        "model": model,
        "scaler": prep["scaler"],
        "report": report,
        "feature_names": prep["feature_names"],
        "stations": prep["stations"],
        "mode": mode,
        "train_seconds": took,
        "has_timestamps": prep["has_timestamps"],
    }


def save_rainfall_checkpoint(result: Dict[str, Any], cfg: Config, directory: Path) -> Path:
    """Write boosters + everything needed to run them later.

    Same self-describing principle as the neural checkpoints: scaler, station
    order, feature builder settings and lead times all travel with the model,
    so the host application needs nothing but this directory.
    """
    d = Path(directory)
    result["model"].save(d)
    stations = result["stations"]
    meta = {
        "arch": "xgb_rainfall",
        "region": cfg.region["name"],
        "region_slug": cfg.slug,
        "freq": cfg.freq,
        "step_hours": cfg.step_minutes / 60.0,
        "n_steps_in": cfg.n_steps_in,
        "n_steps_out": cfg.n_steps_out,
        "lead_times_min": cfg.lead_times,
        "target_station": cfg.model["target_station"],
        "stations": stations.names,
        "station_lat": [s.lat for s in stations],
        "station_lon": [s.lon for s in stations],
        "station_elev": [s.elevation_m for s in stations],
        "blocks": cfg.blocks,
        "feature_mode": result["mode"],
        "feature_names": result["feature_names"],
        "uses_time_features": result["has_timestamps"],
        "scaler": result["scaler"].to_dict(),
        "config": cfg.to_dict(),
        "metrics": {
            "mean_corr_scaled": result["report"].mean_corr_scaled,
            "mean_corr_mm": result["report"].mean_corr_mm,
        },
        "train_seconds": result["train_seconds"],
    }
    (d / "forecaster_meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return d


# --------------------------------------------------------------------------
# landslide
# --------------------------------------------------------------------------
def train_landslide(
    data_root: str,
    out_dir: str,
    max_patches: Optional[int] = None,
    negative_ratio: float = 3.0,
    include_texture: bool = True,
    synthetic: bool = False,
    verbose: bool = True,
) -> Dict[str, Any]:
    """Fit the susceptibility model on Landslide4Sense.

    Splits by *patch*, never by pixel: neighbouring pixels in one 128x128 tile
    are near-duplicates, so a random pixel split leaks the answer across the
    boundary and reports an F1 that collapses on real held-out tiles.
    """
    from ne_rainfall.data.landslide4sense import (
        load_split, patch_to_rows, synthetic_patches,
    )
    from ne_rainfall.models.xgb_landslide import XGBLandslideModel

    if synthetic:
        if verbose:
            print("using synthetic patches -- plumbing check only, not a real model")
        cubes, masks = synthetic_patches(n=40, seed=7, hw=(48, 48))
        xs, ys, pids = [], [], []
        for i, (c, m) in enumerate(zip(cubes, masks)):
            rows, names, _ = patch_to_rows(c, include_texture=include_texture)
            xs.append(rows)
            ys.append(m.reshape(-1))
            pids.append(np.full(len(rows), i))
        x = np.concatenate(xs)
        y = np.concatenate(ys)
        patch_ids = np.concatenate(pids)
        feature_names = names
    else:
        train = load_split(
            data_root, "TrainData", labelled=True,
            negative_ratio=negative_ratio, max_patches=max_patches,
            include_texture=include_texture, verbose=verbose,
        )
        x, y, patch_ids = train.x, train.y, train.patch_ids
        feature_names = train.feature_names

    # Patch-disjoint split.
    uniq = np.unique(patch_ids)
    cut = int(len(uniq) * 0.85)
    train_patches = set(uniq[:cut].tolist())
    is_train = np.array([p in train_patches for p in patch_ids])
    if verbose:
        print(
            f"patch-disjoint split: {cut} train patches / "
            f"{len(uniq) - cut} validation patches"
        )

    model = XGBLandslideModel(feature_names=feature_names)
    model.fit(
        x[is_train], y[is_train],
        eval_set=(x[~is_train], y[~is_train]),
        tune_threshold=True, verbose=verbose,
    )
    if verbose:
        print("\ntop predictors:")
        for name, gain in model.feature_importance(top=12):
            print(f"  {gain:10.2f}  {name}")

    out = Path(out_dir)
    model.save(out)
    (out / "training_notes.json").write_text(
        json.dumps(
            {
                "source": "synthetic" if synthetic else str(data_root),
                "benchmark": "Landslide4Sense 2022 (IARAI)",
                "n_pixels": int(len(x)),
                "positive_fraction": float(np.mean(y)),
                "split": "patch-disjoint 85/15",
                "include_texture": include_texture,
                "negative_ratio": negative_ratio,
                "validation": model.validation,
                "warning": (
                    "synthetic fixture -- has no predictive value"
                    if synthetic else None
                ),
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    return {"model": model, "validation": model.validation, "out_dir": out}


# --------------------------------------------------------------------------
def main(argv: Optional[List[str]] = None) -> int:
    p = argparse.ArgumentParser(
        prog="python -m ne_rainfall.train_xgb",
        description="Train the XGBoost rainfall or landslide model.",
    )
    p.add_argument("--model", choices=["rainfall", "landslide"], default="rainfall")
    p.add_argument("--config", default="config/northeast.yaml")
    p.add_argument("--out", default=None, help="output directory")
    p.add_argument("--feature-mode", choices=["summary", "flatten"], default="summary")
    p.add_argument("--no-classifiers", action="store_true",
                   help="skip the IMD exceedance heads")
    # landslide-only
    p.add_argument("--data-root", default="data/raw/landslide4sense")
    p.add_argument("--max-patches", type=int, default=None)
    p.add_argument("--negative-ratio", type=float, default=3.0)
    p.add_argument("--synthetic", action="store_true",
                   help="train on generated patches (plumbing check, no real skill)")
    p.add_argument("--quiet", action="store_true")
    args = p.parse_args(argv)
    verbose = not args.quiet

    if args.model == "rainfall":
        cfg = load_config(args.config)
        out = Path(args.out or (cfg.path_for("models_dir") / f"{cfg.slug}_xgb_rainfall"))
        result = train_rainfall(
            cfg, mode=args.feature_mode,
            fit_classifiers=not args.no_classifiers, verbose=verbose,
        )
        save_rainfall_checkpoint(result, cfg, out)
        reports = cfg.path_for("reports_dir")
        reports.mkdir(parents=True, exist_ok=True)
        result["report"].save(reports / f"{cfg.slug}_xgb_rainfall_metrics.json")
        print(f"\nsaved model  -> {out}")
        print(f"saved metrics -> {reports / f'{cfg.slug}_xgb_rainfall_metrics.json'}")
        return 0

    out = Path(args.out or "Models/landslide_xgb")
    res = train_landslide(
        data_root=args.data_root, out_dir=str(out),
        max_patches=args.max_patches, negative_ratio=args.negative_ratio,
        synthetic=args.synthetic, verbose=verbose,
    )
    print(f"\nsaved model -> {res['out_dir']}")
    if res["validation"]:
        print(
            f"validation F1 = {res['validation']['f1']:.4f} at threshold "
            f"{res['validation']['threshold']:.2f}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
