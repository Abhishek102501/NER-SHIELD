"""Inference API -- the integration surface for a host application.

The original repo had no inference path at all: the models were trained and
scored inside a Colab session, and the saved weights could not be used
afterwards because the normalisation constants were never saved with them.
This module is the missing half.

Typical use from another project::

    from ne_rainfall import RainfallForecaster

    fc = RainfallForecaster.load("Models/northeast_lstm_torch.pt")

    # (a) live forecast, fetching its own inputs from the open APIs
    result = fc.predict_latest()
    result.to_dict()          # JSON-serialisable, ready for an HTTP response

    # (b) offline, from your own feature matrix
    result = fc.predict(window)   # window: (n_steps_in, n_features) in mm / m per s

Everything the forecaster needs -- station order, block order, scaler, horizon,
frequency -- is read from the checkpoint, so a host app pins one file path and
nothing else.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

import numpy as np
import pandas as pd

from ne_rainfall._compat import ensure_openmp_safety


@dataclass
class ForecastResult:
    """One forecast, in millimetres, with its time axis attached."""

    station: str
    region: str
    issued_at: datetime
    valid_times: List[datetime]
    lead_times_min: List[int]
    rainfall_mm: List[float]
    model: str
    units: str = "mm"
    warnings: List[str] = field(default_factory=list)
    #: Optional model-specific payload (e.g. the XGBoost exceedance
    #: probabilities). Kept generic so the neural and tree forecasters share
    #: one result contract.
    extra: Dict[str, Any] = field(default_factory=dict)

    @property
    def total_mm(self) -> float:
        return float(np.sum(self.rainfall_mm))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "station": self.station,
            "region": self.region,
            "model": self.model,
            "units": self.units,
            "issued_at": self.issued_at.isoformat(),
            "total_mm": round(self.total_mm, 3),
            "steps": [
                {
                    "valid_time": vt.isoformat(),
                    "lead_time_min": lt,
                    "rainfall_mm": round(float(v), 3),
                }
                for vt, lt, v in zip(
                    self.valid_times, self.lead_times_min, self.rainfall_mm
                )
            ],
            "warnings": self.warnings,
            **({"extra": self.extra} if self.extra else {}),
        }

    def to_frame(self) -> pd.DataFrame:
        return pd.DataFrame(
            {
                "valid_time": self.valid_times,
                "lead_time_min": self.lead_times_min,
                "rainfall_mm": self.rainfall_mm,
            }
        )

    def __repr__(self) -> str:
        return (
            f"<ForecastResult {self.station} {self.issued_at:%Y-%m-%d %H:%M} "
            f"+{len(self.rainfall_mm)} steps, total {self.total_mm:.1f} mm>"
        )


class RainfallForecaster:
    """Loads a trained checkpoint and produces forecasts in millimetres."""

    def __init__(self, model, scaler, meta: Dict[str, Any], device: Optional[str] = None):
        self.model = model
        self.scaler = scaler
        self.meta = meta
        self._device = device

    # -- construction --------------------------------------------------------
    @classmethod
    def load(cls, path: str | Path, device: Optional[str] = None) -> "RainfallForecaster":
        """Load a checkpoint written by :func:`ne_rainfall.train.save_checkpoint`."""
        path = Path(path)
        if not path.exists():
            raise FileNotFoundError(f"checkpoint not found: {path}")

        from ne_rainfall.preprocess import Scaler

        if path.suffix == ".keras":
            import json

            import keras

            meta_path = path.with_suffix(".json")
            if not meta_path.exists():
                raise FileNotFoundError(
                    f"Keras checkpoints need their sidecar metadata: {meta_path}"
                )
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            model = keras.models.load_model(path)
            return cls(model, Scaler.from_dict(meta["scaler"]), meta, device)

        ensure_openmp_safety()
        import torch

        meta = torch.load(path, map_location="cpu", weights_only=False)
        if not isinstance(meta, dict) or "model_state" not in meta:
            raise ValueError(
                f"{path} is not a self-describing checkpoint. Checkpoints from "
                "the original Mumbai repo carry no scaler and cannot be used "
                "for inference; retrain with ne_rainfall.train, or use "
                "--init-from to warm-start from them."
            )

        arch = meta.get("arch", "lstm_torch")
        if arch == "lstm_torch":
            from ne_rainfall.models.lstm_torch import LSTMModel

            mc = meta["model_config"]
            model = LSTMModel(
                input_len=mc["input_len"], n_layers=mc["n_layers"],
                n_hidden=mc["n_hidden"], n_steps_out=mc["n_steps_out"],
            )
        elif arch == "transformer":
            from ne_rainfall.models.transformer import build_transformer

            model = build_transformer(
                meta["config"]["model"]["transformer"], meta["model_config"]["d_model"]
            )
        else:
            raise ValueError(f"unsupported arch in checkpoint: {arch}")

        model.load_state_dict(meta["model_state"])
        model.eval()
        return cls(model, Scaler.from_dict(meta["scaler"]), meta, device)

    # -- properties ----------------------------------------------------------
    @property
    def stations(self) -> List[str]:
        return list(self.meta["stations"])

    @property
    def blocks(self) -> List[str]:
        return list(self.meta["blocks"])

    @property
    def target_station(self) -> str:
        return self.meta["target_station"]

    @property
    def n_steps_in(self) -> int:
        return int(self.meta["n_steps_in"])

    @property
    def n_steps_out(self) -> int:
        return int(self.meta["n_steps_out"])

    @property
    def lead_times_min(self) -> List[int]:
        return [int(x) for x in self.meta["lead_times_min"]]

    @property
    def freq(self) -> str:
        return self.meta["freq"]

    @property
    def feature_names(self) -> List[str]:
        """Column order the model expects: ``block::station``."""
        return [f"{b}::{s}" for b in self.blocks for s in self.stations]

    def describe(self) -> Dict[str, Any]:
        """Everything a host app needs to render or validate a request."""
        return {
            "region": self.meta.get("region"),
            "model": self.meta.get("arch"),
            "target_station": self.target_station,
            "stations": self.stations,
            "blocks": self.blocks,
            "n_features": len(self.feature_names),
            "n_steps_in": self.n_steps_in,
            "n_steps_out": self.n_steps_out,
            "freq": self.freq,
            "lead_times_min": self.lead_times_min,
            "training_metrics": self.meta.get("metrics", {}),
        }

    # -- inference -----------------------------------------------------------
    def predict(
        self,
        window: np.ndarray | pd.DataFrame,
        issued_at: Optional[datetime] = None,
        warnings: Optional[Sequence[str]] = None,
    ) -> ForecastResult:
        """Forecast from one input window of RAW values (mm, m/s).

        ``window`` is ``(n_steps_in, n_features)`` with columns in
        :attr:`feature_names` order.  Scaling is applied here, so a caller
        never has to know about the transform.
        """
        arr = self._as_array(window)
        scaled = self.scaler.transform_array(arr)[None, ...]  # (1, in, feat)
        raw_pred = self._forward(scaled)
        mm = self.scaler.inverse(raw_pred, 0).ravel()

        issued_at = issued_at or datetime.now()
        step = timedelta(minutes=self.lead_times_min[0])
        valid = [issued_at + step * (i + 1) for i in range(len(mm))]
        return ForecastResult(
            station=self.target_station,
            region=self.meta.get("region", ""),
            issued_at=issued_at,
            valid_times=valid,
            lead_times_min=self.lead_times_min[: len(mm)],
            rainfall_mm=[float(v) for v in mm],
            model=self.meta.get("arch", "lstm_torch"),
            warnings=list(warnings or []),
        )

    def predict_batch(self, windows: np.ndarray) -> np.ndarray:
        """Vectorised forecast for ``(n, n_steps_in, n_features)`` -> mm."""
        arr = np.asarray(windows, dtype=np.float64)
        if arr.ndim != 3:
            raise ValueError(f"expected (n, steps, features), got {arr.shape}")
        flat = self.scaler.transform_array(arr.reshape(-1, arr.shape[-1]))
        scaled = flat.reshape(arr.shape)
        return self.scaler.inverse(self._forward(scaled), 0)

    def predict_latest(
        self,
        issued_at: Optional[datetime] = None,
        cache_dir: str = "data/raw/cache",
    ) -> ForecastResult:
        """Fetch the most recent observations live and forecast from them.

        Pulls the last ``n_steps_in`` steps of every feature block from the same
        open endpoints the training data came from.  This is the call a
        scheduler or an HTTP handler makes.
        """
        window, warns = self.fetch_latest_window(cache_dir=cache_dir)
        return self.predict(window, issued_at=issued_at, warnings=warns)

    def fetch_latest_window(self, cache_dir: str = "data/raw/cache"):
        """Build the newest ``(n_steps_in, n_features)`` window from live data."""
        from ne_rainfall.data import SourceUnavailable, get_source
        from ne_rainfall.stations import load_stations, map_stations_to_grid

        cfg_raw = self.meta["config"]
        bbox = cfg_raw["region"]["bbox"]
        obs_key = cfg_raw["data"]["sources"]["observed"]
        nwp_key = "gfs"  # live endpoint, regardless of what built the archive

        station_meta = {s.name: s for s in load_stations(
            Path(cfg_raw["region"]["stations_file"])
            if Path(cfg_raw["region"]["stations_file"]).is_absolute()
            else Path(__file__).resolve().parent.parent / cfg_raw["region"]["stations_file"]
        )}
        missing = [s for s in self.stations if s not in station_meta]
        if missing:
            raise ValueError(f"station file no longer has: {', '.join(missing)}")

        ordered = [station_meta[s] for s in self.stations]

        from ne_rainfall.stations import StationSet

        grid = map_stations_to_grid(
            StationSet(ordered), bbox, float(cfg_raw["data"]["nwp_grid_step"])
        )

        # A generous tail so interpolation has room, then take the last rows.
        end = datetime.now().date()
        start = end - timedelta(days=7)
        warns: List[str] = []

        block_frames = []
        for block in self.blocks:
            is_nwp = block.startswith("nwp")
            src = get_source(nwp_key if is_nwp else obs_key, cache_dir=cache_dir)
            cols = {}
            for st in ordered:
                lat, lon = grid[st.name] if is_nwp else (st.lat, st.lon)
                try:
                    df = src.fetch_point(
                        lat, lon, start.isoformat(), end.isoformat(),
                        {block: block}, self.freq,
                    )
                    cols[st.name] = df[block]
                except (SourceUnavailable, KeyError) as exc:
                    warns.append(f"{block}/{st.name}: {exc}")
                    cols[st.name] = pd.Series(dtype=float)
            frame = pd.DataFrame(cols)
            frame.columns = pd.MultiIndex.from_product([[block], frame.columns])
            block_frames.append(frame)

        data = pd.concat(block_frames, axis=1).sort_index()
        data = data.interpolate(limit=3, limit_direction="both").dropna()
        if len(data) < self.n_steps_in:
            raise RuntimeError(
                f"only {len(data)} usable timesteps returned; need "
                f"{self.n_steps_in}. Upstream sources may be degraded: "
                + ("; ".join(warns[:3]) if warns else "no per-station errors reported")
            )
        window = data.iloc[-self.n_steps_in :].to_numpy(dtype=np.float64)
        return window, warns

    # -- internals -----------------------------------------------------------
    def _as_array(self, window) -> np.ndarray:
        expected = (self.n_steps_in, len(self.feature_names))
        if isinstance(window, pd.DataFrame):
            if isinstance(window.columns, pd.MultiIndex):
                window = window.to_numpy()
            else:
                # Reorder by name when the caller gives labelled columns --
                # a column-order mismatch is otherwise silent and catastrophic.
                names = self.feature_names
                if set(window.columns) >= set(names):
                    window = window[names].to_numpy()
                else:
                    window = window.to_numpy()
        arr = np.asarray(window, dtype=np.float64)
        if arr.shape != expected:
            raise ValueError(
                f"window shape {arr.shape} != expected {expected}. "
                f"Columns must be {self.blocks} x {len(self.stations)} stations "
                "in the checkpoint's station order (see .feature_names)."
            )
        return arr

    def _forward(self, scaled: np.ndarray) -> np.ndarray:
        arch = self.meta.get("arch", "lstm_torch")
        if arch == "lstm_tf":
            return np.asarray(self.model.predict(scaled, verbose=0))

        ensure_openmp_safety()
        import torch

        dev = torch.device(self._device) if self._device else next(
            self.model.parameters()
        ).device
        with torch.no_grad():
            x = torch.from_numpy(np.asarray(scaled, dtype=np.float32)).to(dev)
            if arch == "transformer":
                # Decoder is primed with the encoder tail, as in training.
                overlap = int(self.meta["config"]["model"]["transformer"]["dec_overlap"])
                n_out = int(self.meta["config"]["model"]["transformer"]["n_out"])
                dec = x[:, -overlap:, :]
                pad = n_out - dec.shape[1]
                if pad > 0:
                    dec = torch.cat([dec, dec[:, -1:, :].repeat(1, pad, 1)], dim=1)
                out = self.model(x, dec)[:, :, 0]
            else:
                out = self.model(x)
        return out.cpu().numpy()
