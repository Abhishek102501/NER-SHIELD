"""FastAPI routes for North East rainfall forecasting — replaces the earlier
Mumbai module at the same `/rainfall/*` prefix. Synchronous: a single
inference on this LSTM is well under a second, so no background job queue is
needed (same reasoning as the Mumbai/Landslide4Sense modules).
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from nershield_ml.northeast_rainfall.config import DEFAULT_TARGET_STATION, northeast_rainfall_settings
from nershield_ml.northeast_rainfall.demo_data import generate_demo_window
from nershield_ml.northeast_rainfall.inference.preprocessing import HistoricalObservation, RainfallValidationError
from nershield_ml.northeast_rainfall.model.registry import MODEL_VERSION, NortheastRainfallModelRegistry
from nershield_ml.northeast_rainfall.pipeline import explain_forecast, run_forecast
from nershield_ml.northeast_rainfall.schemas import (
    FeatureContributionSchema,
    ForecastPointSchema,
    ForecastRequest,
    NortheastRainfallHealthResponse,
    RainfallExplanationResponse,
    RainfallForecastResponse,
    TrainingMetricsSchema,
)

router = APIRouter(prefix="/rainfall", tags=["northeast-rainfall"])

registry = NortheastRainfallModelRegistry(northeast_rainfall_settings)


def _supported_stations() -> list[str]:
    if registry.is_loaded:
        return [registry.current.forecaster.target_station]
    return [DEFAULT_TARGET_STATION]


def _health_payload() -> dict:
    metrics = registry.current.training_metrics if registry.is_loaded else {}
    return {
        "available": northeast_rainfall_settings.inference_mode == "demo" or registry.is_loaded,
        "loaded": registry.is_loaded,
        "device": registry.current.device if registry.is_loaded else None,
        "model": "northeast_rainfall_lstm",
        "model_version": MODEL_VERSION,
        "inference_mode": northeast_rainfall_settings.inference_mode,
        "reason": None if registry.is_loaded else registry.load_error,
        "supported_stations": _supported_stations(),
        "training_metrics": TrainingMetricsSchema(**metrics) if metrics else None,
    }


def _to_response(result) -> RainfallForecastResponse:
    return RainfallForecastResponse(
        model_version=result.model_version,
        mode=result.mode,
        station=result.station,
        horizon_hours=northeast_rainfall_settings.forecast_hours,
        interval_minutes=60,
        generated_at=result.generated_at,
        forecast=[
            ForecastPointSchema(timestamp=p.timestamp, rainfall_mm=p.rainfall_mm, severity=p.severity)
            for p in result.points
        ],
        training_metrics=TrainingMetricsSchema(**result.training_metrics) if result.training_metrics else None,
        confidence=result.confidence,
        confidence_available=result.confidence_available,
    )


@router.get("/health", response_model=NortheastRainfallHealthResponse)
def rainfall_health() -> NortheastRainfallHealthResponse:
    return NortheastRainfallHealthResponse(**_health_payload())


@router.post("/forecast", response_model=RainfallForecastResponse)
def forecast(request: ForecastRequest) -> RainfallForecastResponse:
    observations = [
        HistoricalObservation(
            timestamp=obs.timestamp, rainfall=obs.rainfall, wind_speed=obs.wind_speed, nwp_precip=obs.nwp_precip
        )
        for obs in request.historical
    ]

    try:
        result = run_forecast(observations, northeast_rainfall_settings, registry)
    except RainfallValidationError as exc:
        raise HTTPException(status_code=422, detail={"error": str(exc), "error_code": exc.code}) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return _to_response(result)


@router.post("/forecast/demo", response_model=RainfallForecastResponse)
def forecast_demo() -> RainfallForecastResponse:
    """Convenience endpoint for the demo account / UI trigger: runs the same
    real pipeline against a generated synthetic window instead of requiring
    the caller to assemble 12 observations x 37 stations by hand.
    """
    observations = generate_demo_window()
    try:
        result = run_forecast(observations, northeast_rainfall_settings, registry)
    except (RainfallValidationError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return _to_response(result)


def _to_explanation_response(explanation) -> RainfallExplanationResponse:
    payload = explanation.to_dict()
    return RainfallExplanationResponse(
        horizon=payload["horizon"],
        lead_time_min=payload["lead_time_min"],
        prediction_mm=payload["prediction_mm"],
        base_mm=payload["base_mm"],
        additivity_error=payload["additivity_error"],
        units_note=payload["units_note"],
        narrative=explanation.narrate(),
        contributions=[FeatureContributionSchema(**c) for c in payload["contributions"]],
    )


@router.post("/explain/demo", response_model=RainfallExplanationResponse)
def explain_demo(horizon: int = 0) -> RainfallExplanationResponse:
    """SHAP (TreeSHAP, exact) attribution for one lead time of a forecast
    against the same synthetic demo window `/forecast/demo` uses. Needs the
    XGBoost co-forecaster loaded (`NORTHEAST_RAINFALL_XGB_MODEL_PATH`) — the
    LSTM alone cannot be explained exactly, see docs/ne_rainfall/SHAP.md#6.
    """
    observations = generate_demo_window()
    try:
        explanation = explain_forecast(observations, registry, horizon=horizon)
    except IndexError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except (RainfallValidationError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return _to_explanation_response(explanation)


@router.post("/explain", response_model=RainfallExplanationResponse)
def explain(request: ForecastRequest, horizon: int = 0) -> RainfallExplanationResponse:
    """Same as `/explain/demo` but against real historical observations."""
    observations = [
        HistoricalObservation(
            timestamp=obs.timestamp, rainfall=obs.rainfall, wind_speed=obs.wind_speed, nwp_precip=obs.nwp_precip
        )
        for obs in request.historical
    ]
    try:
        explanation = explain_forecast(observations, registry, horizon=horizon)
    except RainfallValidationError as exc:
        raise HTTPException(status_code=422, detail={"error": str(exc), "error_code": exc.code}) from exc
    except IndexError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return _to_explanation_response(explanation)
