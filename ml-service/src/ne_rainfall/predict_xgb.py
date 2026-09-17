"""Inference API for the XGBoost models -- the integration surface.

Mirrors :class:`ne_rainfall.predict.RainfallForecaster` deliberately: same
``load`` / ``describe`` / ``predict`` / ``predict_latest`` shape, same
``ForecastResult``, same units.  A host application can swap
``RainfallForecaster`` for ``XGBRainfallForecaster`` by changing one import,
or hold both and ensemble them with :class:`EnsembleForecaster`.

Three entry points::

    XGBRainfallForecaster.load("Models/northeast_xgb_rainfall")
    LandslideRiskModel.load("Models/landslide_xgb")
    CoupledRiskForecaster(rain, landslide)      # rainfall + susceptibility -> risk
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd

from ne_rainfall.predict import ForecastResult
from ne_rainfall.preprocess import Scaler


class XGBRainfallForecaster:
    """Deployable wrapper around a trained :class:`XGBRainfallModel`."""

    def __init__(self, model, scaler: Scaler, meta: Dict[str, Any]):
        self.model = model
        self.scaler = scaler
        self.meta = meta
        self._builder = None

    # -- construction --------------------------------------------------------
    @classmethod
    def load(cls, directory: str | Path) -> "XGBRainfallForecaster":
        from ne_rainfall.models.xgb_rainfall import XGBRainfallModel

        d = Path(directory)
        meta_path = d / "forecaster_meta.json"
        if not meta_path.exists():
            raise FileNotFoundError(
                f"{d} is not an XGBoost forecaster directory "
                "(no forecaster_meta.json). Train one with:\n"
                "  python -m ne_rainfall.train_xgb --model rainfall"
            )
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        model = XGBRainfallModel.load(d)
        return cls(model, Scaler.from_dict(meta["scaler"]), meta)

    # -- properties, matching RainfallForecaster -----------------------------
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
        return list(self.meta["lead_times_min"])

    @property
    def step_hours(self) -> float:
        return float(self.meta.get("step_hours", 1.0))

    @property
    def freq(self) -> str:
        return self.meta["freq"]

    @property
    def feature_names(self) -> List[str]:
        """Names of the *input matrix* columns (block|station), not predictors.

        Same contract as ``RainfallForecaster.feature_names`` so the two accept
        identically-shaped input.  The engineered predictor names the boosters
        actually split on are ``predictor_names``.
        """
        return [f"{b}|{s}" for b in self.blocks for s in self.stations]

    @property
    def predictor_names(self) -> List[str]:
        return list(self.meta.get("feature_names") or [])

    def describe(self) -> Dict[str, Any]:
        return {
            "arch": "xgb_rainfall",
            "region": self.meta.get("region"),
            "target_station": self.target_station,
            "n_stations": len(self.stations),
            "blocks": self.blocks,
            "input_shape": [self.n_steps_in, len(self.feature_names)],
            "output_shape": [self.n_steps_out],
            "lead_times_min": self.lead_times_min,
            "freq": self.freq,
            "units": "mm per step",
            "n_predictors": len(self.predictor_names),
            "feature_mode": self.meta.get("feature_mode"),
            "uses_time_features": bool(self.meta.get("uses_time_features")),
            "exceedance_thresholds_mm": sorted(self.model.classifiers.keys()),
            "metrics": self.meta.get("metrics", {}),
        }

    # -- feature construction ------------------------------------------------
    def _get_builder(self):
        if self._builder is None:
            from ne_rainfall.features.tabular import TabularFeatureBuilder

            self._builder = TabularFeatureBuilder(
                stations=self.stations,
                blocks=self.blocks,
                mode=self.meta.get("feature_mode", "summary"),
                station_lat=self.meta.get("station_lat"),
                station_lon=self.meta.get("station_lon"),
                station_elev=self.meta.get("station_elev"),
            )
        return self._builder

    def _as_array(self, window) -> np.ndarray:
        """Accept a DataFrame (reordered by name) or a raw array."""
        try:
            import pandas as pd
        except ImportError:
            pd = None

        if pd is not None and isinstance(window, pd.DataFrame):
            missing = [c for c in self.feature_names if c not in window.columns]
            if missing:
                raise ValueError(
                    f"window is missing {len(missing)} required columns, "
                    f"e.g. {missing[:3]}. Expected names are forecaster.feature_names."
                )
            arr = window[self.feature_names].to_numpy(dtype=np.float32)
        else:
            arr = np.asarray(window, dtype=np.float32)

        if arr.ndim == 2:
            arr = arr[None, ...]
        if arr.ndim != 3:
            raise ValueError(f"expected (steps, features) or a batch, got {arr.shape}")
        if arr.shape[1] != self.n_steps_in:
            raise ValueError(
                f"expected {self.n_steps_in} timesteps, got {arr.shape[1]}"
            )
        if arr.shape[2] != len(self.feature_names):
            raise ValueError(
                f"expected {len(self.feature_names)} features, got {arr.shape[2]}"
            )
        return arr

    def _featurise(self, raw: np.ndarray, timestamps=None) -> np.ndarray:
        scaled = self.scaler.transform_array(raw.reshape(-1, raw.shape[-1])).reshape(
            raw.shape
        )
        use_ts = timestamps if self.meta.get("uses_time_features") else None
        if self.meta.get("uses_time_features") and timestamps is None:
            raise ValueError(
                "this model was trained with cyclical time features, so "
                "predict() needs `timestamps` -- one per window, marking the "
                "last input step. Retrain without them if your host cannot "
                "supply a timestamp."
            )
        return self._get_builder().transform(scaled, timestamps=use_ts)

    # -- prediction ----------------------------------------------------------
    def predict(
        self,
        window,
        timestamps=None,
        issued_at=None,
        with_exceedance: bool = True,
    ) -> ForecastResult:
        """Forecast from one window. Returns millimetres per step."""
        raw = self._as_array(window)
        if len(raw) != 1:
            raise ValueError("predict() takes one window; use predict_batch()")
        x = self._featurise(raw, timestamps=timestamps)
        scaled = self.model.predict(x)[0]
        mm = self.scaler.inverse(scaled, 0)

        issued_at = issued_at or datetime.now()
        step = timedelta(minutes=self.lead_times_min[0])
        valid = [issued_at + step * (i + 1) for i in range(len(mm))]

        extra: Dict[str, Any] = {}
        if with_exceedance and self.model.classifiers:
            probs = self.model.predict_exceedance(x)
            extra["exceedance"] = {
                f"{thr:g}mm": [round(float(p), 4) for p in probs[thr][0]]
                for thr in sorted(probs)
            }

        return ForecastResult(
            station=self.target_station,
            region=self.meta.get("region", ""),
            issued_at=issued_at,
            valid_times=valid,
            lead_times_min=self.lead_times_min[: len(mm)],
            rainfall_mm=[float(v) for v in mm],
            model="xgb_rainfall",
            extra=extra,
        )

    def predict_batch(self, windows, timestamps=None) -> np.ndarray:
        """``(n, n_steps_out)`` in millimetres."""
        raw = self._as_array(windows)
        x = self._featurise(raw, timestamps=timestamps)
        scaled = self.model.predict(x)
        return np.stack(
            [self.scaler.inverse(scaled[:, h], 0) for h in range(scaled.shape[1])],
            axis=1,
        )

    def predict_latest(self, cache_dir: str = "data/raw/cache") -> ForecastResult:
        """Fetch the most recent observations and forecast from them.

        Reuses the neural forecaster's fetcher so both models see byte-identical
        live input -- which is what makes the ensemble meaningful.
        """
        from ne_rainfall.predict import RainfallForecaster

        helper = RainfallForecaster.__new__(RainfallForecaster)
        helper.meta = self.meta
        helper.scaler = self.scaler
        window, warns = helper.fetch_latest_window(cache_dir=cache_dir)

        issued_at = datetime.now()
        # The time features describe the LAST INPUT step, which is one step
        # before the first forecast step -- not the issue time itself.
        last_input = issued_at
        if isinstance(window, pd.DataFrame) and len(window.index):
            try:
                last_input = pd.Timestamp(window.index[-1]).to_pydatetime()
            except Exception:
                pass
        result = self.predict(window, timestamps=[last_input], issued_at=issued_at)
        result.warnings.extend(warns or [])
        return result

    def feature_importance(self, horizon: Optional[int] = None, top: int = 20):
        return self.model.feature_importance(horizon=horizon, top=top)


class LandslideRiskModel:
    """Deployable wrapper around the susceptibility classifier."""

    def __init__(self, model, notes: Optional[Dict[str, Any]] = None):
        self.model = model
        self.notes = notes or {}

    @classmethod
    def load(cls, directory: str | Path) -> "LandslideRiskModel":
        from ne_rainfall.models.xgb_landslide import XGBLandslideModel

        d = Path(directory)
        model = XGBLandslideModel.load(d)
        notes_path = d / "training_notes.json"
        notes = (
            json.loads(notes_path.read_text(encoding="utf-8"))
            if notes_path.exists()
            else {}
        )
        return cls(model, notes)

    @property
    def is_synthetic(self) -> bool:
        return self.notes.get("source") == "synthetic"

    def describe(self) -> Dict[str, Any]:
        return {
            "arch": "xgb_landslide",
            "benchmark": self.notes.get("benchmark"),
            "decision_threshold": self.model.decision_threshold,
            "validation": self.model.validation,
            "n_predictors": len(self.model.feature_names or []),
            "trained_on": self.notes.get("source"),
            "warning": self.notes.get("warning"),
        }

    def susceptibility(self, bands: np.ndarray) -> np.ndarray:
        """Per-pixel probability from a ``(n_pixels, 14)`` band matrix."""
        from ne_rainfall.features.spectral import SpectralFeatureBuilder

        include_texture = bool(
            self.notes.get("include_texture", True)
        )
        b = np.asarray(bands, dtype=np.float32)
        if b.ndim == 3:
            return self.model.predict_patch(b, include_texture=include_texture)
        builder = SpectralFeatureBuilder(include_indices=True, include_texture=False)
        x = builder.transform(b)
        if include_texture:
            raise ValueError(
                "this model expects neighbourhood texture features, so it needs "
                "a (14, H, W) patch rather than a flat pixel list"
            )
        return self.model.predict_proba(x)

    def susceptibility_for_patch(self, cube: np.ndarray) -> np.ndarray:
        """``(14, H, W)`` -> ``(H, W)`` susceptibility map."""
        return self.model.predict_patch(
            cube, include_texture=bool(self.notes.get("include_texture", True))
        )


class EnsembleForecaster:
    """Average the neural and tree forecasts, and expose their disagreement.

    The spread between two models with genuinely different inductive biases is
    the cheapest honest uncertainty estimate available here, and the risk engine
    turns it into a confidence.
    """

    def __init__(self, members: Sequence[Any], weights: Optional[Sequence[float]] = None):
        if len(members) < 2:
            raise ValueError("an ensemble needs at least two members")
        self.members = list(members)
        if weights is None:
            weights = [1.0 / len(members)] * len(members)
        if len(weights) != len(members):
            raise ValueError("weights and members must be the same length")
        total = float(sum(weights))
        self.weights = [float(w) / total for w in weights]

        horizons = {m.n_steps_out for m in self.members}
        if len(horizons) != 1:
            raise ValueError(f"members disagree on horizon length: {horizons}")

    def predict(self, window, timestamps=None, issued_at=None) -> Dict[str, Any]:
        per_member: List[List[float]] = []
        names: List[str] = []
        for m in self.members:
            try:
                r = m.predict(window, timestamps=timestamps, issued_at=issued_at)
            except TypeError:
                # The neural forecaster takes no timestamps.
                r = m.predict(window, issued_at=issued_at)
            per_member.append(list(r.rainfall_mm))
            names.append(r.model)

        arr = np.asarray(per_member, dtype=np.float64)
        mean = np.average(arr, axis=0, weights=self.weights)
        spread = arr.std(axis=0)
        return {
            "station": self.members[0].target_station,
            "lead_times_min": self.members[0].lead_times_min,
            "rainfall_mm": [round(float(v), 3) for v in mean],
            "spread_mm": [round(float(v), 3) for v in spread],
            "members": dict(zip(names, [[round(v, 3) for v in m] for m in per_member])),
            "model": "ensemble(" + "+".join(names) + ")",
        }


class CoupledRiskForecaster:
    """Rainfall forecast + terrain susceptibility -> IMD-referenced risk.

    This is the product the two source repositories point at between them:
    a Landslide4Sense-style susceptibility layer, triggered by a rainfall
    nowcast, reported in DARPAN's confidence-bearing risk form.
    """

    def __init__(
        self,
        rainfall,
        landslide: Optional[LandslideRiskModel] = None,
        engine=None,
    ):
        from ne_rainfall.risk.engine import RiskEngine

        self.rainfall = rainfall
        self.landslide = landslide
        self.engine = engine or RiskEngine(
            step_hours=getattr(rainfall, "step_hours", 1.0)
        )

    def assess(
        self,
        window,
        susceptibility: Optional[float] = None,
        timestamps=None,
        issued_at=None,
        ensemble_members: Optional[Sequence[Any]] = None,
    ) -> Dict[str, Any]:
        """Full risk record for one station, JSON-ready."""
        result = self.rainfall.predict(
            window, timestamps=timestamps, issued_at=issued_at
        )
        forecast_mm = list(result.rainfall_mm)

        exceedance = None
        extra = getattr(result, "extra", None)
        if extra and "exceedance" in extra:
            # Probability of exceedance anywhere in the horizon, from the
            # per-step heads: 1 - prod(1 - p). Independence across steps is an
            # approximation; it over-states slightly for a persistent storm.
            exceedance = {}
            for key, per_step in extra["exceedance"].items():
                thr = float(key.replace("mm", ""))
                p = np.asarray(per_step, dtype=np.float64)
                exceedance[thr] = float(1.0 - np.prod(1.0 - np.clip(p, 0, 1)))

        members = None
        if ensemble_members:
            members = []
            for m in ensemble_members:
                try:
                    r = m.predict(window, timestamps=timestamps, issued_at=issued_at)
                except TypeError:
                    r = m.predict(window, issued_at=issued_at)
                members.append(list(r.rainfall_mm))

        record = self.engine.combined(
            station=self.rainfall.target_station,
            forecast_mm=forecast_mm,
            susceptibility=susceptibility,
            exceedance=exceedance,
            ensemble=members,
            susceptibility_confidence=(
                0.2 if (self.landslide and self.landslide.is_synthetic) else 0.5
            ),
        )
        record["forecast_mm"] = [round(v, 3) for v in forecast_mm]
        record["lead_times_min"] = self.rainfall.lead_times_min
        # Take it from the result, not the argument: predict() defaults it to
        # now when the caller omits it, and the record should say when the
        # forecast was actually issued.
        record["issued_at"] = result.issued_at.isoformat()
        record["valid_times"] = [v.isoformat() for v in result.valid_times]
        if self.landslide and self.landslide.is_synthetic:
            record.setdefault("warnings", []).append(
                "landslide model was trained on synthetic patches and carries "
                "no predictive value"
            )
        return record
