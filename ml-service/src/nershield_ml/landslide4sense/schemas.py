"""Pydantic request/response models for the Landslide4Sense API — wire
contract the Java backend's `com.nershield.landslide` package proxies,
mirroring how `api/schemas.py`'s `HealthResponse` is pinned to
`AIHealthResponse`.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

AnalysisStatus = Literal[
    "queued", "preprocessing", "running", "postprocessing", "completed", "failed", "cancelled"
]


class DetectionSchema(BaseModel):
    id: str
    geometry: dict
    area_m2: float
    area_km2: float
    mean_probability: float = Field(..., description="Mean model probability across this detection's pixels.")
    max_probability: float
    pixel_fraction_above_threshold: float
    confidence: float = Field(
        ...,
        description=(
            "Same value as mean_probability, surfaced explicitly: this is "
            "model output confidence, NOT a validated real-world accuracy figure."
        ),
    )
    severity: Literal["low", "moderate", "high", "critical"]
    centroid: dict
    model: str
    model_version: str
    detected_at: str


class AnalysisSummary(BaseModel):
    detections: int
    affected_area_km2: float
    critical: int
    high: int
    moderate: int
    low: int


class LandslideAnalysisResponse(BaseModel):
    analysis_id: str
    status: AnalysisStatus
    mode: Literal["real", "mock"] = Field(
        ..., description="Whether this analysis ran the real model or the labeled mock pipeline."
    )
    model_name: str
    model_version: str
    error: str | None = None
    error_code: str | None = None
    summary: AnalysisSummary | None = None
    detections: list[DetectionSchema] = []
    geojson: dict | None = None


class LandslideHealthResponse(BaseModel):
    available: bool
    loaded: bool
    device: str | None = None
    model: str
    version: str
    inference_mode: Literal["real", "mock"]
    reason: str | None = None
