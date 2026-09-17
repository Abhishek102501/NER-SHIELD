"""Orchestrates validate -> (real forecaster.predict | demo trend) ->
classify-severity, mirroring `landslide4sense.pipeline.run_analysis`.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

import numpy as np

from nershield_ml.northeast_rainfall.config import (
    DEFAULT_TARGET_STATION,
    FORECAST_HORIZON,
    INTERVAL_MINUTES,
    NortheastRainfallSettings,
)
from nershield_ml.northeast_rainfall.inference.preprocessing import HistoricalObservation, validate_and_order
from nershield_ml.northeast_rainfall.model.registry import MODEL_VERSION, NortheastRainfallModelRegistry
from nershield_ml.northeast_rainfall.risk import classify_rainfall_severity

logger = logging.getLogger("nershield_ml.northeast_rainfall")


class ForecastPoint:
    def __init__(self, timestamp: datetime, rainfall_mm: float, severity: str):
        self.timestamp = timestamp
        self.rainfall_mm = rainfall_mm
        self.severity = severity


class RainfallForecastResult:
    def __init__(
        self,
        points: list[ForecastPoint],
        mode: str,
        station: str,
        training_metrics: dict | None = None,
        confidence: float | None = None,
    ):
        self.points = points
        self.mode = mode
        self.station = station
        self.model_version = MODEL_VERSION
        self.generated_at = datetime.now(timezone.utc)
        self.training_metrics = training_metrics or {}
        self.confidence = confidence
        self.confidence_available = confidence is not None


def _run_demo(observations: list[HistoricalObservation], settings: NortheastRainfallSettings) -> RainfallForecastResult:
    """Deterministic, clearly-labeled stand-in — NOT a real prediction.
    Extrapolates the target station's own recent rainfall trend, same
    approach as the earlier Mumbai module's demo path.
    """
    window = validate_and_order(observations)
    target_col = 0  # rainfall::<target station>, first column by construction
    recent = window[-4:, target_col]
    base = float(recent.mean())
    trend = float(recent[-1] - recent[0]) / 4.0
    steps = np.arange(1, FORECAST_HORIZON + 1)
    forecast_mm = np.clip(base + trend * steps, 0.0, None)

    last_ts = sorted(observations, key=lambda o: o.timestamp)[-1].timestamp
    points = [
        ForecastPoint(
            timestamp=last_ts + timedelta(minutes=INTERVAL_MINUTES * (i + 1)),
            rainfall_mm=round(float(mm), 3),
            severity=classify_rainfall_severity(float(mm), settings),
        )
        for i, mm in enumerate(forecast_mm)
    ]
    return RainfallForecastResult(points=points, mode="demo", station=DEFAULT_TARGET_STATION)


def _ensemble_confidence(members_mm: list[list[float]]) -> float:
    """Same normalisation as `ne_rainfall.risk.engine.RiskEngine._confidence`:
    compare each member's forecast *total* over the horizon, not per-step —
    a spread equal to the mean total is treated as no usable agreement.
    """
    totals = np.array([sum(m) for m in members_mm], dtype=np.float64)
    mean = float(totals.mean())
    spread = float(totals.std())
    rel = spread / mean if mean > 1e-6 else (0.0 if spread < 1e-6 else 1.0)
    return float(np.clip(1.0 - rel, 0.0, 1.0))


def _run_real(
    observations: list[HistoricalObservation],
    settings: NortheastRainfallSettings,
    registry: NortheastRainfallModelRegistry,
) -> RainfallForecastResult:
    loaded = registry.current
    forecaster = loaded.forecaster

    window = validate_and_order(
        observations,
        stations=forecaster.stations,
        blocks=forecaster.blocks,
        sequence_length=forecaster.n_steps_in,
    )

    confidence: float | None = None
    if loaded.ensemble is not None:
        # Two models with different inductive biases (LSTM + XGBoost) agreeing
        # is the cheapest honest uncertainty estimate available — see
        # ne_rainfall/risk/engine.py's docstring. The ensemble MEAN is what we
        # report as the forecast, not the LSTM alone, since the vendored
        # project's own comparison shows XGBoost has the better mean
        # correlation of the two (docs/ne_rainfall/reports/MODEL_COMPARISON.md).
        # `timestamps` marks the *last input step* (required by the XGBoost
        # member's cyclical time features); `issued_at` is when the forecast
        # is dated from — same `datetime.now()` default `forecaster.predict()`
        # itself would use, made explicit and shared so both members and our
        # own valid_times agree on one instant rather than each calling
        # `datetime.now()` separately microseconds apart.
        # Naive `datetime.now()`, matching what `forecaster.predict()` itself
        # defaults to when no `issued_at` is given (the non-ensemble branch
        # below) — kept consistent so valid_times has the same
        # naive/aware-ness regardless of which branch ran.
        last_ts = window_last_timestamp(observations)
        issued_at = datetime.now()
        ensemble_out = loaded.ensemble.predict(window, timestamps=[last_ts], issued_at=issued_at)
        rainfall_mm = ensemble_out["rainfall_mm"]
        valid_times = _valid_times_from(issued_at, ensemble_out["lead_times_min"], len(rainfall_mm))
        station = ensemble_out["station"]
        confidence = _ensemble_confidence(list(ensemble_out["members"].values()))
    else:
        result = forecaster.predict(window)
        rainfall_mm = result.rainfall_mm
        valid_times = result.valid_times
        station = result.station

    points = [
        ForecastPoint(
            timestamp=vt,
            rainfall_mm=round(float(mm), 3),
            severity=classify_rainfall_severity(float(mm), settings),
        )
        for vt, mm in zip(valid_times, rainfall_mm)
    ]
    return RainfallForecastResult(
        points=points,
        mode="real",
        station=station,
        training_metrics=loaded.training_metrics,
        confidence=confidence,
    )


def window_last_timestamp(observations: list[HistoricalObservation]) -> datetime:
    return sorted(observations, key=lambda o: o.timestamp)[-1].timestamp


def _valid_times_from(issued_at: datetime, lead_times_min: list[int], n: int) -> list[datetime]:
    return [issued_at + timedelta(minutes=m) for m in lead_times_min[:n]]


def explain_forecast(
    observations: list[HistoricalObservation],
    registry: NortheastRainfallModelRegistry,
    horizon: int = 0,
):
    """Returns a `ne_rainfall.explain.LocalExplanation` for one lead time of a
    forecast built from `observations`.

    Raises `RainfallValidationError` (bad input, same as `run_forecast`) or
    `RuntimeError` if no explainer is available — either no checkpoint is
    loaded at all, or the loaded real-mode setup has no XGBoost co-forecaster
    (TreeSHAP is exact only for tree ensembles, never the LSTM — see
    docs/ne_rainfall/SHAP.md#6). The API layer turns both into a clean 503,
    never a fabricated explanation.
    """
    if not registry.is_loaded:
        raise RuntimeError(f"No North East rainfall checkpoint is loaded — reason: {registry.load_error}")
    loaded = registry.current
    if loaded.explainer is None:
        raise RuntimeError(
            "No XGBoost co-forecaster is loaded (NORTHEAST_RAINFALL_XGB_MODEL_PATH) — "
            "SHAP explanations need it; the LSTM alone cannot be explained exactly."
        )

    xgb = loaded.xgb_forecaster
    window = validate_and_order(
        observations,
        stations=xgb.stations,
        blocks=xgb.blocks,
        sequence_length=xgb.n_steps_in,
    )
    last_ts = window_last_timestamp(observations)
    return loaded.explainer.explain(window, horizon=horizon, timestamps=[last_ts])


def run_forecast(
    observations: list[HistoricalObservation],
    settings: NortheastRainfallSettings,
    registry: NortheastRainfallModelRegistry,
) -> RainfallForecastResult:
    """Raises `RainfallValidationError` (bad input) or `RuntimeError` (real
    mode requested with no checkpoint) — the API layer catches these and
    returns a clean error, never a fabricated forecast.
    """
    mode = "real" if registry.is_loaded else "demo"
    if settings.inference_mode == "demo":
        mode = "demo"
    elif settings.inference_mode == "real" and not registry.is_loaded:
        raise RuntimeError(
            f"NORTHEAST_RAINFALL_INFERENCE_MODE=real but no checkpoint is loaded — reason: {registry.load_error}"
        )

    if mode == "real":
        result = _run_real(observations, settings, registry)
    else:
        result = _run_demo(observations, settings)

    logger.info(
        "North East rainfall forecast complete: mode=%s station=%s points=%d",
        result.mode, result.station, len(result.points),
    )
    return result
