"""Command line entry point.

    python -m ne_rainfall.cli <command> [options]

Commands
    stations      list the configured stations and their NWP grid nodes
    sources       show every data source, its provenance and whether it is up
    search-ogd    search data.gov.in for a live rainfall resource id
    build-data    download and assemble the feature matrix
    train         train a model (thin wrapper over ne_rainfall.train)
    evaluate      re-score a saved checkpoint against the built dataset
    predict       produce a live forecast from a checkpoint
    doctor        check the environment end to end
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import List, Optional

from ne_rainfall.config import load_config


def cmd_stations(args) -> int:
    from ne_rainfall.stations import load_stations, map_stations_to_grid

    cfg = load_config(args.config)
    stations = load_stations(cfg.stations_path).reordered_with_target_first(
        cfg.model["target_station"]
    )
    grid = map_stations_to_grid(
        stations, cfg.region["bbox"], float(cfg.data["nwp_grid_step"])
    )
    print(f"{cfg.region['name']}: {len(stations)} stations "
          f"-> {cfg.expected_n_features(len(stations))} features\n")
    print(f"{'#':>3} {'station':<20} {'state':<18} {'lat':>8} {'lon':>8} "
          f"{'elev m':>7}  nwp grid")
    for i, s in enumerate(stations):
        elev = f"{s.elevation_m:.0f}" if s.elevation_m is not None else "-"
        gl, gn = grid[s.name]
        marker = " *" if s.name == cfg.model["target_station"] else "  "
        print(f"{i:>3} {s.name:<20} {s.state:<18} {s.lat:>8.4f} {s.lon:>8.4f} "
              f"{elev:>7}  {gl:.2f}N {gn:.2f}E{marker}")
    print("\n* = target station (column 0 of the feature matrix)")
    return 0


def cmd_sources(args) -> int:
    import ne_rainfall.data as data_pkg  # noqa: F401  (populates the registry)
    from ne_rainfall.data.base import _REGISTRY

    print(f"{'key':<16} {'creds':<6} provenance")
    for key in sorted(_REGISTRY):
        cls = _REGISTRY[key]
        creds = "yes" if getattr(cls, "requires_credentials", False) else "no"
        print(f"{key:<16} {creds:<6} {cls.provenance}")

    if args.check:
        print("\nreachability check:")
        from ne_rainfall.data import SourceUnavailable, get_source

        probes = {
            "era5": (26.1445, 91.7362, "2020-06-01", "2020-06-02", {"rainfall": "rainfall"}),
            "nasa_power": (26.1445, 91.7362, "2020-06-01", "2020-06-02", {"rainfall": "rainfall"}),
            "gfs": (26.1445, 91.7362, "2020-06-01", "2020-06-02", {"nwp_precip": "nwp_precip"}),
        }
        for key, (lat, lon, s, e, vs) in probes.items():
            try:
                df = get_source(key).fetch_point(lat, lon, s, e, vs, "1h")
                print(f"  {key:<16} OK   {len(df)} rows")
            except Exception as exc:
                print(f"  {key:<16} FAIL {str(exc)[:90]}")
    return 0


def cmd_search_ogd(args) -> int:
    from ne_rainfall.data.data_gov_in import DataGovIn

    client = DataGovIn(api_key=args.api_key)
    try:
        df = client.search(args.query, limit=args.limit)
    except Exception as exc:
        print(f"data.gov.in search failed: {exc}", file=sys.stderr)
        return 1
    import pandas as pd

    with pd.option_context("display.max_colwidth", 60, "display.width", 200):
        print(df.to_string(index=False))
    print("\nPaste a resource_id into your own loader, or pass it to "
          "DataGovIn(resource_id=...).records().")
    return 0


def cmd_build_data(args) -> int:
    from ne_rainfall.dataset_preparation import build_dataset

    cfg = load_config(args.config)
    if args.start:
        cfg = cfg.with_overrides({"data.start_date": args.start})
    if args.end:
        cfg = cfg.with_overrides({"data.end_date": args.end})
    _, manifest = build_dataset(cfg, verbose=not args.quiet)
    print(f"\n{manifest.n_rows} rows x {manifest.n_features} features")
    return 0


def cmd_train(args) -> int:
    from ne_rainfall.train import main as train_main

    argv = ["--config", args.config, "--model", args.model]
    if args.epochs is not None:
        argv += ["--epochs", str(args.epochs)]
    if args.init_from:
        argv += ["--init-from", args.init_from]
    if args.device:
        argv += ["--device", args.device]
    return train_main(argv)


def cmd_evaluate(args) -> int:
    import numpy as np

    from ne_rainfall.dataset_preparation import load_matrix
    from ne_rainfall.evaluate import evaluate
    from ne_rainfall.predict import RainfallForecaster
    from ne_rainfall.preprocess import chronological_split, make_windows

    cfg = load_config(args.config)
    fc = RainfallForecaster.load(args.checkpoint)
    data = load_matrix(cfg)
    _, test_raw = chronological_split(
        np.asarray(data, np.float64), float(cfg.windowing["train_split"])
    )
    test = fc.scaler.transform_array(test_raw)
    x_test, y_test = make_windows(test, fc.n_steps_in, fc.n_steps_out, 0)
    pred = fc._forward(x_test)
    report = evaluate(
        pred, y_test, fc.scaler, fc.lead_times_min,
        region=cfg.region["name"], model_name=fc.meta.get("arch", ""),
        thresholds_mm=cfg.evaluate.get("thresholds_mm"), x_test=x_test,
    )
    print(report.summary())
    return 0


def cmd_predict(args) -> int:
    from ne_rainfall.predict import RainfallForecaster

    fc = RainfallForecaster.load(args.checkpoint)
    result = fc.predict_latest()
    if args.json:
        print(json.dumps(result.to_dict(), indent=2))
    else:
        print(f"{result.station} ({result.region}) issued {result.issued_at:%Y-%m-%d %H:%M}")
        print(f"{'valid':<20} {'lead':>6} {'mm':>8}")
        for row in result.to_frame().itertuples():
            print(f"{row.valid_time:%Y-%m-%d %H:%M}     {row.lead_time_min:>6} "
                  f"{row.rainfall_mm:>8.2f}")
        print(f"{'total':<27} {result.total_mm:>8.2f} mm")
        for w in result.warnings[:5]:
            print(f"warning: {w}")
    return 0


def cmd_doctor(args) -> int:
    cfg = load_config(args.config)
    ok = True

    print("configuration")
    print(f"  region          {cfg.region['name']} ({cfg.slug})")
    print(f"  freq            {cfg.freq}  ->  lead times "
          f"{cfg.lead_times[0]}..{cfg.lead_times[-1]} min")
    print(f"  season          {cfg.season['start_month_day']} .. "
          f"{cfg.season['end_month_day']}")
    print(f"  transform       {cfg.preprocess['transform']} + {cfg.preprocess['scaler']}")

    print("\nstations")
    try:
        from ne_rainfall.stations import load_stations

        st = load_stations(cfg.stations_path)
        n_feat = cfg.expected_n_features(len(st))
        match = n_feat == int(cfg.model["n_features"])
        print(f"  {len(st)} stations x {len(cfg.blocks)} blocks = {n_feat} features "
              f"{'(matches model.n_features)' if match else '(MISMATCH!)'}")
        ok &= match
    except Exception as exc:
        print(f"  FAILED: {exc}")
        ok = False

    from ne_rainfall._compat import openmp_status

    omp = openmp_status()
    if omp["at_risk"]:
        print("\nopenmp (macOS: torch + xgboost share a process)")
        if omp["guard_applied"] or omp["omp_num_threads"] == "1":
            print("  OMP_NUM_THREADS=1 -- guard active, both models are safe "
                  "to load together")
            print("  install both from conda-forge and set "
                  "NE_RAINFALL_SKIP_OMP_GUARD=1 to regain threading")
        elif omp["guard_skipped_by_env"]:
            print("  guard disabled by NE_RAINFALL_SKIP_OMP_GUARD -- make sure "
                  "torch and xgboost share one OpenMP runtime")
        else:
            print("  WARNING: guard not applied and OMP_NUM_THREADS is unset.")
            print("  Loading the neural and tree models in one process may "
                  "segfault. Import ne_rainfall before torch/xgboost, or set "
                  "OMP_NUM_THREADS=1.")
            ok = False

    print("\npython packages")
    for pkg, why in [("numpy", "required"), ("pandas", "required"),
                     ("yaml", "required"), ("torch", "LSTM/Transformer"),
                     ("keras", "TensorFlow LSTM"), ("matplotlib", "plots"),
                     ("xarray", "IMD NetCDF"), ("xgboost", "gradient-boosted models"),
                     ("h5py", "Landslide4Sense patches"),
                     ("sklearn", "metrics"),
                     ("shap", "SHAP plot styles (attribution works without it)")]:
        try:
            __import__(pkg)
            print(f"  {pkg:<12} present   ({why})")
        except ImportError:
            required = why == "required"
            print(f"  {pkg:<12} MISSING   ({why})")
            ok &= not required

    print("\ndataset")
    npy = cfg.path_for("processed_dir") / f"{cfg.slug}_features.npy"
    mani = cfg.path_for("processed_dir") / f"{cfg.slug}_manifest.json"
    if npy.exists():
        import numpy as np

        arr = np.load(npy)
        print(f"  built: {arr.shape[0]} rows x {arr.shape[1]} features  ({npy})")
        if mani.exists():
            m = json.loads(mani.read_text())
            print(f"  sources: {m['sources']}  season: {m['season_window']}")
    else:
        print(f"  not built yet -- run:  python -m ne_rainfall.cli build-data")

    print("\ncheckpoints")
    models_dir = cfg.path_for("models_dir")
    found = sorted(models_dir.glob("*.pt")) + sorted(models_dir.glob("*.keras"))
    for f in found:
        print(f"  {f.name}  (neural)")

    # Gradient-boosted models are directories of native JSON, not single files.
    for d in sorted(p for p in models_dir.glob("*") if p.is_dir()):
        if (d / "forecaster_meta.json").exists():
            import json as _json

            meta = _json.loads((d / "forecaster_meta.json").read_text(encoding="utf-8"))
            corr = meta.get("metrics", {}).get("mean_corr_scaled")
            extra = f", mean corr {corr:.4f}" if isinstance(corr, float) else ""
            print(f"  {d.name}/  (xgb rainfall{extra})")
            found.append(d)
        elif (d / "landslide_meta.json").exists():
            import json as _json

            notes_path = d / "training_notes.json"
            notes = (
                _json.loads(notes_path.read_text(encoding="utf-8"))
                if notes_path.exists() else {}
            )
            warn = "  [SYNTHETIC -- no predictive value]" if notes.get("warning") else ""
            print(f"  {d.name}/  (xgb landslide){warn}")
            found.append(d)

    if not found:
        print("  none yet")

    print("\n" + ("all required checks passed" if ok else "problems found above"))
    return 0 if ok else 1


def cmd_train_xgb(args) -> int:
    from ne_rainfall.train_xgb import main as xgb_main

    argv = ["--model", "rainfall", "--config", args.config,
            "--feature-mode", args.feature_mode]
    if args.out:
        argv += ["--out", args.out]
    if args.no_classifiers:
        argv.append("--no-classifiers")
    return xgb_main(argv)


def cmd_train_landslide(args) -> int:
    from ne_rainfall.train_xgb import main as xgb_main

    argv = ["--model", "landslide", "--data-root", args.data_root]
    if args.out:
        argv += ["--out", args.out]
    if args.max_patches:
        argv += ["--max-patches", str(args.max_patches)]
    if args.synthetic:
        argv.append("--synthetic")
    return xgb_main(argv)


def cmd_risk(args) -> int:
    """Live coupled risk assessment: rainfall forecast + landslide trigger."""
    import json

    from ne_rainfall.predict_xgb import (
        CoupledRiskForecaster, LandslideRiskModel, XGBRainfallForecaster,
    )

    rain = XGBRainfallForecaster.load(args.model)
    landslide = None
    if args.landslide_model:
        landslide = LandslideRiskModel.load(args.landslide_model)
        if landslide.is_synthetic:
            print(
                "warning: the landslide model was trained on synthetic patches "
                "and has no predictive value\n", file=sys.stderr,
            )

    coupled = CoupledRiskForecaster(rain, landslide)
    result = rain.predict_latest(cache_dir=args.cache_dir)

    members = None
    if args.ensemble_with:
        from ne_rainfall.predict import RainfallForecaster

        members = [rain, RainfallForecaster.load(args.ensemble_with)]

    record = coupled.engine.combined(
        station=rain.target_station,
        forecast_mm=list(result.rainfall_mm),
        susceptibility=args.susceptibility,
        exceedance=_horizon_exceedance(result),
        ensemble=(
            [list(m.predict_latest(cache_dir=args.cache_dir).rainfall_mm) for m in members]
            if members else None
        ),
    )
    record["issued_at"] = result.issued_at.isoformat()
    record["forecast_mm"] = [round(v, 3) for v in result.rainfall_mm]
    record["lead_times_min"] = result.lead_times_min
    if result.warnings:
        record.setdefault("warnings", []).extend(result.warnings)
    print(json.dumps(record, indent=2))
    return 0


def _horizon_exceedance(result):
    """Collapse per-step exceedance probabilities to one per threshold."""
    import numpy as np

    extra = getattr(result, "extra", None) or {}
    if "exceedance" not in extra:
        return None
    out = {}
    for key, per_step in extra["exceedance"].items():
        p = np.clip(np.asarray(per_step, dtype=float), 0.0, 1.0)
        out[float(key.replace("mm", ""))] = float(1.0 - np.prod(1.0 - p))
    return out


def cmd_importance(args) -> int:
    """Which predictors the gradient-boosted model actually relies on."""
    from ne_rainfall.predict_xgb import XGBRainfallForecaster

    fc = XGBRainfallForecaster.load(args.model)
    rows = fc.feature_importance(horizon=args.horizon, top=args.top)
    scope = f"horizon {args.horizon + 1}" if args.horizon is not None else "all horizons"
    print(f"top {len(rows)} predictors by mean gain ({scope}):\n")
    width = max((len(n) for n, _ in rows), default=10)
    for name, gain in rows:
        print(f"  {name:<{width}}  {gain:10.2f}")
    return 0


def cmd_explain(args) -> int:
    """SHAP attribution for the gradient-boosted rainfall model."""
    import json

    from ne_rainfall.config import load_config
    from ne_rainfall.dataset_preparation import load_matrix
    from ne_rainfall.explain import RainfallExplainer
    from ne_rainfall.explain.narrate import narrate_global
    from ne_rainfall.predict_xgb import XGBRainfallForecaster
    from ne_rainfall.train_xgb import build_features

    fc = XGBRainfallForecaster.load(args.model)
    ex = RainfallExplainer.from_forecaster(fc)
    cfg = load_config(args.config)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.live:
        # Explain the newest real forecast.
        result = fc.predict_latest(cache_dir=args.cache_dir)
        window, _ = _latest_window(fc, args.cache_dir)
        expl = ex.explain(window, horizon=args.horizon,
                          timestamps=[window.index[-1]])
        print(expl.narrate(n=args.top))
        if args.json:
            (out_dir / "live_explanation.json").write_text(
                json.dumps(expl.to_dict(top=args.top), indent=2), encoding="utf-8"
            )
            print(f"\nwrote {out_dir / 'live_explanation.json'}")
        return 0

    # Global attribution over the held-out test split.
    prep = build_features(cfg, load_matrix(cfg), verbose=False)
    x = prep["x_test"]
    print(f"explaining {len(x)} held-out windows x {fc.n_steps_out} horizons ...")
    importance = ex.global_importance(x_features=x, max_samples=args.max_samples)
    print()
    print(narrate_global(importance, n=args.top))

    importance.save(out_dir / "global_importance.json")
    print(f"\nwrote {out_dir / 'global_importance.json'}")

    if not args.no_plots:
        try:
            from ne_rainfall.explain import plots

            sv, fv, names = ex.shap_matrix(
                x_features=x[: args.max_samples], horizon=args.horizon
            )
            lead = fc.lead_times_min[args.horizon]
            plots.beeswarm(sv, fv, names, out_dir / f"beeswarm_h{args.horizon + 1}.png",
                           title=f"+{lead} min forecast")
            plots.horizon_heatmap(importance, out_dir / "horizon_heatmap.png")
            top_name = importance.top(1)[0][0]
            plots.dependence(sv, fv, names, top_name,
                             out_dir / f"dependence_{top_name}.png")
            print(f"wrote figures to {out_dir}/")
        except ImportError as exc:
            print(f"(skipping figures: {exc})", file=sys.stderr)
    return 0


def _latest_window(fc, cache_dir: str):
    """Fetch the newest input window, as predict_latest does internally."""
    from ne_rainfall.predict import RainfallForecaster

    helper = RainfallForecaster.__new__(RainfallForecaster)
    helper.meta = fc.meta
    helper.scaler = fc.scaler
    return helper.fetch_latest_window(cache_dir=cache_dir)


def build_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(prog="ne_rainfall", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--config", default="config/northeast.yaml")
    sub = ap.add_subparsers(dest="command", required=True)

    sub.add_parser("stations", help="list stations and grid mapping").set_defaults(fn=cmd_stations)

    p = sub.add_parser("sources", help="list data sources")
    p.add_argument("--check", action="store_true", help="probe each source")
    p.set_defaults(fn=cmd_sources)

    p = sub.add_parser("search-ogd", help="search data.gov.in for a resource id")
    p.add_argument("query", nargs="?", default="rainfall")
    p.add_argument("--limit", type=int, default=20)
    p.add_argument("--api-key", default=None)
    p.set_defaults(fn=cmd_search_ogd)

    p = sub.add_parser("build-data", help="download and assemble the feature matrix")
    p.add_argument("--start", default=None)
    p.add_argument("--end", default=None)
    p.add_argument("--quiet", action="store_true")
    p.set_defaults(fn=cmd_build_data)

    p = sub.add_parser("train", help="train a model")
    p.add_argument("--model", default="lstm_torch",
                   choices=["lstm_torch", "lstm_tf", "transformer"])
    p.add_argument("--epochs", type=int, default=None)
    p.add_argument("--init-from", default=None)
    p.add_argument("--device", default=None)
    p.set_defaults(fn=cmd_train)

    p = sub.add_parser("evaluate", help="score a checkpoint")
    p.add_argument("checkpoint")
    p.set_defaults(fn=cmd_evaluate)

    p = sub.add_parser("predict", help="live forecast from a checkpoint")
    p.add_argument("checkpoint")
    p.add_argument("--json", action="store_true")
    p.set_defaults(fn=cmd_predict)

    p = sub.add_parser("train-xgb", help="train the gradient-boosted rainfall model")
    p.add_argument("--config", default="config/northeast.yaml")
    p.add_argument("--out", default=None)
    p.add_argument("--feature-mode", choices=["summary", "flatten"], default="summary")
    p.add_argument("--no-classifiers", action="store_true",
                   help="skip the IMD exceedance probability heads")
    p.set_defaults(fn=cmd_train_xgb)

    p = sub.add_parser("train-landslide",
                       help="train landslide susceptibility on Landslide4Sense")
    p.add_argument("--data-root", default="data/raw/landslide4sense")
    p.add_argument("--out", default="Models/landslide_xgb")
    p.add_argument("--max-patches", type=int, default=None)
    p.add_argument("--synthetic", action="store_true",
                   help="use generated patches to check the plumbing offline")
    p.set_defaults(fn=cmd_train_landslide)

    p = sub.add_parser("risk", help="live coupled rainfall + landslide risk")
    p.add_argument("--model", default="Models/northeast_xgb_rainfall")
    p.add_argument("--landslide-model", default=None)
    p.add_argument("--susceptibility", type=float, default=None,
                   help="terrain susceptibility 0-1 for the target station")
    p.add_argument("--ensemble-with", default=None,
                   help="a neural checkpoint to ensemble with, for confidence")
    p.add_argument("--cache-dir", default="data/raw/cache")
    p.set_defaults(fn=cmd_risk)

    p = sub.add_parser("importance", help="rank the tree model's predictors")
    p.add_argument("--model", default="Models/northeast_xgb_rainfall")
    p.add_argument("--horizon", type=int, default=None,
                   help="0-based horizon; omit to average across all")
    p.add_argument("--top", type=int, default=20)
    p.set_defaults(fn=cmd_importance)

    p = sub.add_parser("explain", help="SHAP attribution for the tree model")
    p.add_argument("--model", default="Models/northeast_xgb_rainfall")
    p.add_argument("--config", default="config/northeast.yaml")
    p.add_argument("--horizon", type=int, default=0,
                   help="0-based horizon for the per-sample figures")
    p.add_argument("--top", type=int, default=12)
    p.add_argument("--max-samples", type=int, default=2000)
    p.add_argument("--out", default="reports/shap")
    p.add_argument("--live", action="store_true",
                   help="explain the newest live forecast instead of the test split")
    p.add_argument("--json", action="store_true", help="also write JSON")
    p.add_argument("--no-plots", action="store_true")
    p.add_argument("--cache-dir", default="data/raw/cache")
    p.set_defaults(fn=cmd_explain)

    sub.add_parser("doctor", help="check the environment").set_defaults(fn=cmd_doctor)
    return ap


def main(argv: Optional[List[str]] = None) -> int:
    args = build_parser().parse_args(argv)
    return args.fn(args)


if __name__ == "__main__":
    raise SystemExit(main())
