"""Loads the North East rainfall `RainfallForecaster` once (at API startup,
mirroring `landslide4sense.model.registry.LandslideModelRegistry`) and holds
it in memory. A missing/invalid/unset checkpoint is a normal, reportable
state, never a crash and never a fabricated "loaded" status.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from nershield_ml.northeast_rainfall.config import NortheastRainfallSettings

logger = logging.getLogger("nershield_ml.northeast_rainfall")

MODEL_NAME = "northeast_rainfall_lstm"
MODEL_VERSION = "ne_rainfall (regional port of omkar-nitsure/Mumbai_RainFall_Forecasting)"


def resolve_device(requested: str) -> str:
    import torch

    if requested == "auto":
        return "cuda" if torch.cuda.is_available() else "cpu"
    if requested == "cuda" and not torch.cuda.is_available():
        logger.warning("NORTHEAST_RAINFALL_DEVICE=cuda requested but no CUDA device is available; using cpu.")
        return "cpu"
    return requested


@dataclass
class LoadedNortheastForecaster:
    forecaster: "object"  # ne_rainfall.predict.RainfallForecaster
    device: str
    checkpoint_path: str
    training_metrics: dict
    # Optional second model + the ensemble wrapper combining it with
    # `forecaster` — both None when no xgb_model_path is configured or it
    # failed to load. Never required: real mode works with `forecaster`
    # alone, same as before the ensemble existed.
    xgb_forecaster: "object | None" = None  # ne_rainfall.predict_xgb.XGBRainfallForecaster
    ensemble: "object | None" = None  # ne_rainfall.EnsembleForecaster
    explainer: "object | None" = None  # ne_rainfall.RainfallExplainer — TreeSHAP, needs xgb_forecaster


class NortheastRainfallModelRegistry:
    """Holds at most one loaded `RainfallForecaster`. `load()` runs once from
    the FastAPI lifespan; a missing/invalid checkpoint leaves
    `is_loaded == False` rather than raising.
    """

    def __init__(self, settings: NortheastRainfallSettings):
        self.settings = settings
        self._loaded: LoadedNortheastForecaster | None = None
        self._load_error: str | None = None

    @property
    def is_loaded(self) -> bool:
        return self._loaded is not None

    @property
    def load_error(self) -> str | None:
        return self._load_error

    @property
    def current(self) -> LoadedNortheastForecaster:
        if self._loaded is None:
            raise RuntimeError(self._load_error or "North East rainfall model is not loaded.")
        return self._loaded

    def load(self) -> None:
        if not self.settings.model_enabled:
            self._loaded = None
            self._load_error = "NORTHEAST_RAINFALL_MODEL_ENABLED=false"
            return

        if self.settings.model_path is None:
            self._loaded = None
            self._load_error = "NORTHEAST_RAINFALL_MODEL_PATH is not set."
            return

        if not self.settings.model_path.exists():
            self._loaded = None
            self._load_error = "Checkpoint not found at configured NORTHEAST_RAINFALL_MODEL_PATH."
            return

        device = resolve_device(self.settings.device)
        try:
            from ne_rainfall import RainfallForecaster

            forecaster = RainfallForecaster.load(self.settings.model_path, device=device)
        except Exception as exc:  # noqa: BLE001 - surfaced via load_error, not raised
            self._loaded = None
            self._load_error = f"Checkpoint failed to load: {exc.__class__.__name__}: {exc}"
            logger.exception("Failed to load North East rainfall checkpoint")
            return

        metrics = forecaster.meta.get("metrics", {}) or {}
        mean_corr = metrics.get("mean_corr_scaled")
        if mean_corr is not None and mean_corr < 0.15:
            # Not a hard refusal — an operator explicitly pointed at this
            # file — but a checkpoint this weak must never be silently
            # presented as trustworthy. Surfaced again in health()/describe().
            logger.warning(
                "Loaded North East rainfall checkpoint has weak/no measured skill "
                "(mean_corr_scaled=%.3f) — every forecast response will still say "
                "mode=real, but treat its output as unvalidated.",
                mean_corr,
            )

        xgb_forecaster, ensemble = self._load_xgb(forecaster)
        explainer = self._load_explainer(xgb_forecaster)

        self._loaded = LoadedNortheastForecaster(
            forecaster=forecaster,
            device=device,
            checkpoint_path=str(self.settings.model_path),
            training_metrics=metrics,
            xgb_forecaster=xgb_forecaster,
            ensemble=ensemble,
            explainer=explainer,
        )
        self._load_error = None
        logger.info(
            "Loaded North East rainfall checkpoint on device=%s (xgb ensemble %s)",
            device,
            "enabled" if ensemble is not None else "disabled",
        )

    def _load_xgb(self, lstm_forecaster):
        """Best-effort load of the optional XGBoost co-forecaster. Any failure
        (path unset, missing files, bad checkpoint) is logged and treated as
        "not available" — never fatal, since the LSTM alone is a complete,
        working real-mode path on its own.
        """
        if self.settings.xgb_model_path is None:
            return None, None
        if not self.settings.xgb_model_path.exists():
            logger.warning(
                "NORTHEAST_RAINFALL_XGB_MODEL_PATH is set but %s does not exist — "
                "running real mode on the LSTM alone, no ensemble confidence.",
                self.settings.xgb_model_path,
            )
            return None, None
        try:
            from ne_rainfall import EnsembleForecaster, XGBRainfallForecaster

            xgb_forecaster = XGBRainfallForecaster.load(self.settings.xgb_model_path)
            ensemble = EnsembleForecaster([xgb_forecaster, lstm_forecaster])
        except Exception:  # noqa: BLE001 - degrade to LSTM-only, never crash startup
            logger.exception(
                "Failed to load XGBoost co-forecaster at %s — running real mode on "
                "the LSTM alone, no ensemble confidence.",
                self.settings.xgb_model_path,
            )
            return None, None
        return xgb_forecaster, ensemble

    def _load_explainer(self, xgb_forecaster):
        """TreeSHAP is exact for the XGBoost model only — never for the LSTM
        (see docs/SHAP.md#6). No xgb_forecaster means no explainer, same
        best-effort/non-fatal rule as `_load_xgb`.
        """
        if xgb_forecaster is None:
            return None
        try:
            from ne_rainfall import RainfallExplainer

            return RainfallExplainer.from_forecaster(xgb_forecaster)
        except Exception:  # noqa: BLE001 - degrade to no explanations, never crash startup
            logger.exception("Failed to build RainfallExplainer — /rainfall/explain will be unavailable.")
            return None

    def reload(self) -> None:
        self.load()
