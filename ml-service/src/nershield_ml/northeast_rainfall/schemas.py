"""Pydantic request/response models for the North East rainfall forecast API
— wire contract the Java backend's `com.nershield.rainfall` package proxies,
mirroring `landslide4sense.schemas`. Same shape as the earlier Mumbai module
so the existing Java/frontend layers need no structural changes, only
updated expectations (12h horizon, hourly interval, 37 NE stations).
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class HistoricalObservationSchema(BaseModel):
    timestamp: datetime
    rainfall: dict[str, float] = Field(..., description="mm, keyed by station name")
    wind_speed: dict[str, float] = Field(..., description="m/s, keyed by station name")
    nwp_precip: dict[str, float] = Field(..., description="NWP precipitation forecast, keyed by station name")


class ForecastRequest(BaseModel):
    historical: list[HistoricalObservationSchema] = Field(
        ..., description="At least 12 observations at 60-minute intervals, most recent last."
    )


class ForecastPointSchema(BaseModel):
    timestamp: datetime
    rainfall_mm: float
    severity: Literal["low", "moderate", "high", "critical"]


class TrainingMetricsSchema(BaseModel):
    mean_corr_scaled: float | None = None
    mean_corr_mm: float | None = None


class RainfallForecastResponse(BaseModel):
    model: str = "northeast_rainfall_lstm"
    model_version: str
    mode: Literal["real", "demo"] = Field(
        ..., description="Whether this forecast ran a real trained checkpoint or the labeled demo pipeline."
    )
    station: str
    geographic_scope: str = "North East India"
    is_generalized: bool = Field(
        False, description="This model is trained only for North East India stations, not an India-wide forecaster."
    )
    horizon_hours: float
    interval_minutes: int
    generated_at: datetime
    forecast: list[ForecastPointSchema]
    confidence: float | None = None
    confidence_available: bool = False
    training_metrics: TrainingMetricsSchema | None = Field(
        None,
        description="Measured skill of the loaded checkpoint (mode=real only), so a weak/unvalidated "
        "checkpoint is never presented without its own numbers alongside it.",
    )
    error: str | None = None
    error_code: str | None = None


class NortheastRainfallHealthResponse(BaseModel):
    available: bool
    loaded: bool
    device: str | None = None
    model: str
    model_version: str
    inference_mode: Literal["real", "demo"]
    reason: str | None = None
    supported_stations: list[str]
    training_metrics: TrainingMetricsSchema | None = None


class FeatureContributionSchema(BaseModel):
    feature: str
    value: float
    shap_scaled: float
    effect_mm: float
    direction: Literal["increased", "decreased", "no effect"]


class RainfallExplanationResponse(BaseModel):
    horizon: int
    lead_time_min: int
    prediction_mm: float
    base_mm: float
    additivity_error: float = Field(
        ..., description="How exactly shap_scaled sums to the prediction in the model's output space — near-zero."
    )
    units_note: str
    narrative: str
    contributions: list[FeatureContributionSchema]
