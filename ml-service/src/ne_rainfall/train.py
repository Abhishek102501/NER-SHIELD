"""Training.

One entry point for all three architectures.  The training procedure is the
original's -- Adam, MSE, cosine-annealed LR, 50 epochs -- with the additions
that keeping accuracy across a region change actually requires:

* a validation split carved out of the training data, so early stopping has
  something honest to watch.  The original trained a fixed 50 epochs and
  reported the final state, which on a new region can easily be past the point
  of overfitting.
* shuffled batches.  The original set ``shuffle=False`` in the DataLoader
  while its README says shuffling was used to stop the model extrapolating the
  previous value.  Shuffling is on here, matching the stated intent.
* optional warm start from a Mumbai checkpoint (``--init-from``).
* the scaler, the config and the station order are saved *inside* the
  checkpoint, so a trained model is self-describing and can be loaded by
  ``predict.py`` without the training session.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from typing import Any, Dict, Optional

import numpy as np

from ne_rainfall._compat import ensure_openmp_safety
from ne_rainfall.config import Config, load_config
from ne_rainfall.dataset_preparation import load_matrix
from ne_rainfall.evaluate import evaluate, plot_correlation, plot_timeseries
from ne_rainfall.preprocess import prepare
from ne_rainfall.stations import load_stations


def _set_seed(seed: int) -> None:
    np.random.seed(seed)
    ensure_openmp_safety()
    try:
        import torch

        torch.manual_seed(seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(seed)
    except ImportError:
        pass


def _device(requested: Optional[str] = None):
    ensure_openmp_safety()
    import torch

    if requested:
        return torch.device(requested)
    if torch.cuda.is_available():
        return torch.device("cuda")
    # Apple Silicon: MPS is a large speedup over CPU for these sizes.
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


# ---------------------------------------------------------------------------
# PyTorch LSTM
# ---------------------------------------------------------------------------
def train_lstm_torch(
    cfg: Config,
    data: np.ndarray,
    init_from: Optional[str] = None,
    device: Optional[str] = None,
    seed: int = 42,
    verbose: bool = True,
) -> Dict[str, Any]:
    ensure_openmp_safety()
    import torch
    import torch.nn as nn
    import torch.optim as optim
    import torch.utils.data as tdata

    from ne_rainfall.models.lstm_torch import build_lstm_torch, load_mumbai_checkpoint

    _set_seed(seed)
    hp = cfg.model["lstm_torch"]
    pp = cfg.preprocess
    dev = _device(device)

    split = prepare(
        data,
        cfg.n_steps_in,
        cfg.n_steps_out,
        train_split=float(cfg.windowing["train_split"]),
        transform=pp["transform"],
        method=pp["scaler"],
        clip_quantile=pp.get("clip_quantile"),
    )
    x_train, y_train = split["x_train"], split["y_train"]
    x_test, y_test = split["x_test"], split["y_test"]
    scaler = split["scaler"]

    # Hold out the tail of training for validation; chronological, so it never
    # contains a window that overlaps a training window.
    n_val = max(1, int(0.1 * len(x_train)))
    x_val, y_val = x_train[-n_val:], y_train[-n_val:]
    x_train, y_train = x_train[:-n_val], y_train[:-n_val]

    model = build_lstm_torch(hp, split["n_features"], cfg.n_steps_out)
    if init_from:
        load_mumbai_checkpoint(model, init_from, verbose=verbose)
    model = model.to(dev)

    loss_fn = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=float(hp.get("lr", 1e-3)))
    scheduler = optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=int(hp.get("scheduler_t_max", 64))
    )

    loader = tdata.DataLoader(
        tdata.TensorDataset(torch.from_numpy(x_train), torch.from_numpy(y_train)),
        batch_size=int(hp.get("batch_size", 32)),
        # Shuffled, per the original README's stated intent: the model must
        # learn rainfall structure, not extrapolate the previous value.
        shuffle=True,
        drop_last=False,
    )
    xv = torch.from_numpy(x_val).to(dev)
    yv = torch.from_numpy(y_val).to(dev)

    epochs = int(hp.get("epochs", 50))
    patience = int(hp.get("patience", 10))
    best_val, best_state, best_epoch, since_best = float("inf"), None, -1, 0
    history = []

    t0 = time.time()
    for epoch in range(epochs):
        model.train()
        epoch_loss = 0.0
        for xb, yb in loader:
            xb, yb = xb.to(dev), yb.to(dev)
            optimizer.zero_grad()
            loss = loss_fn(model(xb), yb)
            loss.backward()
            # The original had no clipping; a 4-layer LSTM on a heavy-tailed
            # target occasionally takes a destructive step without it.
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            epoch_loss += loss.item()
        scheduler.step()

        model.eval()
        with torch.no_grad():
            val_loss = float(loss_fn(model(xv), yv).item())
        history.append({"epoch": epoch + 1, "train_loss": epoch_loss, "val_loss": val_loss})
        if verbose:
            print(f"epoch {epoch + 1:>3}/{epochs}  train {epoch_loss:>10.4f}  val {val_loss:.6f}")

        if val_loss < best_val - 1e-7:
            best_val, best_epoch, since_best = val_loss, epoch + 1, 0
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
        else:
            since_best += 1
            if since_best >= patience:
                if verbose:
                    print(f"early stop at epoch {epoch + 1}; best was {best_epoch}")
                break

    if best_state is not None:
        model.load_state_dict(best_state)
    model.eval()

    with torch.no_grad():
        predicted = model(torch.from_numpy(x_test).to(dev)).cpu().numpy()

    report = evaluate(
        predicted,
        y_test,
        scaler,
        cfg.lead_times,
        region=cfg.region["name"],
        model_name="LSTM (PyTorch)",
        thresholds_mm=cfg.evaluate.get("thresholds_mm"),
        x_test=x_test,
    )
    return {
        "model": model,
        "scaler": scaler,
        "report": report,
        "history": history,
        "best_epoch": best_epoch,
        "predicted": predicted,
        "y_test": y_test,
        "train_seconds": round(time.time() - t0, 1),
        "arch": "lstm_torch",
    }


# ---------------------------------------------------------------------------
# Keras LSTM
# ---------------------------------------------------------------------------
def train_lstm_tf(cfg: Config, data: np.ndarray, seed: int = 42,
                  verbose: bool = True) -> Dict[str, Any]:
    import keras

    from ne_rainfall.models.lstm_tf import build_lstm_tf

    _set_seed(seed)
    keras.utils.set_random_seed(seed)
    hp = cfg.model["lstm_tf"]
    pp = cfg.preprocess

    split = prepare(
        data, cfg.n_steps_in, cfg.n_steps_out,
        train_split=float(cfg.windowing["train_split"]),
        transform=pp["transform"], method=pp["scaler"],
        clip_quantile=pp.get("clip_quantile"),
    )
    model = build_lstm_tf(hp, split["n_features"], cfg.n_steps_in, cfg.n_steps_out)
    t0 = time.time()
    model.fit(
        split["x_train"], split["y_train"],
        epochs=int(hp.get("epochs", 50)),
        batch_size=int(hp.get("batch_size", 12)),
        validation_split=0.1,
        shuffle=True,
        verbose=1 if verbose else 0,
        callbacks=[
            keras.callbacks.EarlyStopping(
                monitor="val_loss", patience=int(hp.get("patience", 10)),
                restore_best_weights=True,
            )
        ],
    )
    predicted = model.predict(split["x_test"], verbose=0)
    report = evaluate(
        predicted, split["y_test"], split["scaler"], cfg.lead_times,
        region=cfg.region["name"], model_name="LSTM (TensorFlow)",
        thresholds_mm=cfg.evaluate.get("thresholds_mm"), x_test=split["x_test"],
    )
    return {
        "model": model, "scaler": split["scaler"], "report": report,
        "predicted": predicted, "y_test": split["y_test"],
        "train_seconds": round(time.time() - t0, 1), "arch": "lstm_tf",
    }


# ---------------------------------------------------------------------------
# Transformer
# ---------------------------------------------------------------------------
def train_transformer(cfg: Config, data: np.ndarray, device: Optional[str] = None,
                      seed: int = 42, verbose: bool = True) -> Dict[str, Any]:
    ensure_openmp_safety()
    import torch
    import torch.nn as nn
    import torch.optim as optim
    import torch.utils.data as tdata

    from ne_rainfall.models.transformer import build_transformer, make_transformer_windows
    from ne_rainfall.preprocess import Scaler, chronological_split

    _set_seed(seed)
    hp = cfg.model["transformer"]
    pp = cfg.preprocess
    dev = _device(device)

    n_enc, n_out = int(hp["n_enc"]), int(hp["n_out"])
    overlap = int(hp["dec_overlap"])
    # The decoder input spans [n_enc - overlap, n_enc - overlap + n_out), so it
    # already contains the true values for the first (n_out - overlap) target
    # steps.  Those steps are leaked and must not be scored -- this is the
    # hard-coded `[:, 4:, 0]` slice in the original, derived here instead.
    leaked = max(0, n_out - overlap)
    scored = n_out - leaked

    train_raw, test_raw = chronological_split(
        np.asarray(data, np.float64), float(cfg.windowing["train_split"])
    )
    scaler = Scaler(pp["transform"], pp["scaler"], pp.get("clip_quantile")).fit(train_raw)
    train, test = scaler.transform_array(train_raw), scaler.transform_array(test_raw)

    enc_tr, dec_tr, out_tr = make_transformer_windows(train, n_enc, n_out, overlap)
    enc_te, dec_te, out_te = make_transformer_windows(test, n_enc, n_out, overlap)

    model = build_transformer(hp, train.shape[1]).to(dev)
    loss_fn = nn.MSELoss()
    optimizer = optim.Adam(model.parameters())
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=64)

    loader = tdata.DataLoader(
        tdata.TensorDataset(*[torch.from_numpy(a) for a in (enc_tr, dec_tr, out_tr)]),
        batch_size=int(hp.get("batch_size", 32)), shuffle=True,
    )

    t0 = time.time()
    for epoch in range(int(hp.get("epochs", 50))):
        model.train()
        epoch_loss = 0.0
        for enc, dec, out in loader:
            enc, dec, out = enc.to(dev), dec.to(dev), out.to(dev)
            optimizer.zero_grad()
            pred = model(enc, dec)
            loss = loss_fn(pred[:, :, 0], out[:, :, 0])
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            epoch_loss += loss.item()
        scheduler.step()
        if verbose:
            print(f"epoch {epoch + 1}  loss {epoch_loss:.4f}")

    model.eval()
    with torch.no_grad():
        predicted = model(
            torch.from_numpy(enc_te).to(dev), torch.from_numpy(dec_te).to(dev)
        ).cpu().numpy()

    # Score only the horizon steps the decoder was not handed the answer for.
    pred_scored = predicted[:, leaked:, 0]
    obs_scored = out_te[:, leaked:, 0]
    assert pred_scored.shape[1] == scored
    # Last value genuinely observed before the scored horizon: the final
    # decoder-input step, which is the encoder tail extended by the leaked
    # steps.  Passing it explicitly keeps the persistence baseline honest.
    last_observed = (
        out_te[:, leaked - 1, 0] if leaked > 0 else enc_te[:, -1, 0]
    )
    report = evaluate(
        pred_scored, obs_scored, scaler, cfg.lead_times,
        region=cfg.region["name"], model_name="Transformer",
        thresholds_mm=cfg.evaluate.get("thresholds_mm"),
        last_observed=last_observed,
    )
    return {
        "model": model, "scaler": scaler, "report": report,
        "predicted": pred_scored, "y_test": obs_scored,
        "train_seconds": round(time.time() - t0, 1), "arch": "transformer",
    }


# ---------------------------------------------------------------------------
# Persistence / saving / CLI
# ---------------------------------------------------------------------------
def save_checkpoint(result: Dict[str, Any], cfg: Config, path: Path) -> Path:
    """Write a self-describing checkpoint.

    Bundling the scaler and the station order with the weights is what makes a
    checkpoint usable outside the session that trained it -- the gap that made
    the original ``.pth`` files un-deployable.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    stations = load_stations(cfg.stations_path).reordered_with_target_first(
        cfg.model["target_station"]
    )
    meta = {
        "arch": result["arch"],
        "region": cfg.region["name"],
        "region_slug": cfg.slug,
        "freq": cfg.freq,
        "n_steps_in": cfg.n_steps_in,
        "n_steps_out": cfg.n_steps_out,
        "lead_times_min": cfg.lead_times,
        "target_station": cfg.model["target_station"],
        "stations": stations.names,
        "blocks": cfg.blocks,
        "scaler": result["scaler"].to_dict(),
        "config": cfg.to_dict(),
        "metrics": {
            "mean_corr_scaled": result["report"].mean_corr_scaled,
            "mean_corr_mm": result["report"].mean_corr_mm,
        },
    }

    if result["arch"] == "lstm_tf":
        model_path = path.with_suffix(".keras")
        result["model"].save(model_path)
        meta["weights_file"] = model_path.name
        path.with_suffix(".json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
        return model_path

    ensure_openmp_safety()
    import torch

    meta["model_state"] = result["model"].state_dict()
    meta["model_config"] = result["model"].config()
    torch.save(meta, path)
    return path


def main(argv: Optional[list] = None) -> int:
    ap = argparse.ArgumentParser(description="Train a North East rainfall model")
    ap.add_argument("--config", default="config/northeast.yaml")
    ap.add_argument("--model", default="lstm_torch",
                    choices=["lstm_torch", "lstm_tf", "transformer"])
    ap.add_argument("--epochs", type=int, default=None, help="override config")
    ap.add_argument("--init-from", default=None,
                    help="warm-start from a checkpoint, e.g. the Mumbai LSTM .pth")
    ap.add_argument("--device", default=None, help="cpu | cuda | mps")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--out", default=None, help="checkpoint path")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args(argv)

    cfg = load_config(args.config)
    if args.epochs is not None:
        cfg = cfg.with_overrides({f"model.{args.model}.epochs": args.epochs})

    data = load_matrix(cfg)
    print(f"data: {data.shape[0]} rows x {data.shape[1]} features "
          f"({cfg.region['name']}, {cfg.freq})")

    verbose = not args.quiet
    if args.model == "lstm_torch":
        result = train_lstm_torch(cfg, data, init_from=args.init_from,
                                  device=args.device, seed=args.seed, verbose=verbose)
    elif args.model == "lstm_tf":
        result = train_lstm_tf(cfg, data, seed=args.seed, verbose=verbose)
    else:
        result = train_transformer(cfg, data, device=args.device,
                                   seed=args.seed, verbose=verbose)

    print()
    print(result["report"].summary())

    out = Path(args.out) if args.out else (
        cfg.path_for("models_dir") / f"{cfg.slug}_{args.model}.pt"
    )
    saved = save_checkpoint(result, cfg, out)
    print(f"\ncheckpoint -> {saved}")

    reports = cfg.path_for("reports_dir")
    reports.mkdir(parents=True, exist_ok=True)
    result["report"].save(reports / f"{cfg.slug}_{args.model}_metrics.json")

    scaler = result["scaler"]
    plot_timeseries(
        scaler.inverse(result["predicted"], 0), scaler.inverse(result["y_test"], 0),
        reports / f"{cfg.slug}_{args.model}_plot.png",
        title=f"{cfg.model['target_station']} -- {result['report'].model}",
        step_minutes=cfg.step_minutes,
    )
    plot_correlation(result["report"], reports / f"{cfg.slug}_{args.model}_corr.png")
    print(f"report   -> {reports}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
