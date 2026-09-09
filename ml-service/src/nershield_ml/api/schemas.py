"""Pydantic request/response models for the API layer.

`HealthResponse`'s field names are pinned to the Java `AIHealthResponse`
record's wire contract established with the backend
(backend/src/main/java/com/nershield/ai/dto/AIHealthResponse.java):
`status`, `model_loaded`, `model_version`, `last_trained` — snake_case,
exactly.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from nershield_ml.data.schema import CATEGORICAL_VALUES, NUMERIC_RANGES


class HazardZoneFeatures(BaseModel):
    """Request body for POST /predict — one hazard zone's raw feature vector,
    the same column contract training data is validated against.
    """

    slope: float = Field(..., ge=NUMERIC_RANGES["slope"][0], le=NUMERIC_RANGES["slope"][1])
    elevation: float = Field(
        ..., ge=NUMERIC_RANGES["elevation"][0], le=NUMERIC_RANGES["elevation"][1]
    )
    aspect: float = Field(..., ge=NUMERIC_RANGES["aspect"][0], le=NUMERIC_RANGES["aspect"][1])
    curvature: float = Field(
        ..., ge=NUMERIC_RANGES["curvature"][0], le=NUMERIC_RANGES["curvature"][1]
    )
    drainage_proximity: float = Field(
        ...,
        ge=NUMERIC_RANGES["drainage_proximity"][0],
        le=NUMERIC_RANGES["drainage_proximity"][1],
    )
    ndvi: float = Field(..., ge=NUMERIC_RANGES["ndvi"][0], le=NUMERIC_RANGES["ndvi"][1])
    rainfall_3d: float = Field(
        ..., ge=NUMERIC_RANGES["rainfall_3d"][0], le=NUMERIC_RANGES["rainfall_3d"][1]
    )
    rainfall_7d: float = Field(
        ..., ge=NUMERIC_RANGES["rainfall_7d"][0], le=NUMERIC_RANGES["rainfall_7d"][1]
    )
    rainfall_15d: float = Field(
        ..., ge=NUMERIC_RANGES["rainfall_15d"][0], le=NUMERIC_RANGES["rainfall_15d"][1]
    )
    historical_incident_count: int = Field(..., ge=0)

    land_cover: Literal[tuple(CATEGORICAL_VALUES["land_cover"])]  # type: ignore[valid-type]
    soil_type: Literal[tuple(CATEGORICAL_VALUES["soil_type"])]  # type: ignore[valid-type]
    lithology: Literal[tuple(CATEGORICAL_VALUES["lithology"])]  # type: ignore[valid-type]

    model_config = {
        "json_schema_extra": {
            "example": {
                "slope": 34.5,
                "elevation": 1120.0,
                "aspect": 210.0,
                "curvature": 0.8,
                "drainage_proximity": 85.0,
                "land_cover": "forest",
                "soil_type": "laterite",
                "lithology": "schist",
                "ndvi": 0.42,
                "rainfall_3d": 120.0,
                "rainfall_7d": 260.0,
                "rainfall_15d": 410.0,
                "historical_incident_count": 2,
            }
        }
    }


class Factor(BaseModel):
    feature: str
    contribution: float


class PredictResponse(BaseModel):
    score: int = Field(..., ge=0, le=100)
    risk_band: Literal["Low", "Moderate", "High", "Severe"]
    confidence: float = Field(..., ge=0, le=1)
    model_version: str
    factors: list[Factor]


class HealthResponse(BaseModel):
    status: Literal["UP", "DOWN"]
    model_loaded: bool
    model_version: str | None = None
    last_trained: str | None = None
