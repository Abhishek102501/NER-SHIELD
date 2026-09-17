"""FastAPI routes for Landslide4Sense — included into the main app in
api/main.py, following the same "no fabricated result" rule as /predict:
if the requested mode can't actually run, the API says so (503/failed
status), it never substitutes a fake completed analysis.
"""

from __future__ import annotations

import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from nershield_ml.landslide4sense.config import landslide_settings
from nershield_ml.landslide4sense.demo_data import generate_demo_scene
from nershield_ml.landslide4sense.jobs import health_payload, job_store
from nershield_ml.landslide4sense.model.registry import LandslideModelRegistry
from nershield_ml.landslide4sense.schemas import (
    AnalysisSummary,
    LandslideAnalysisResponse,
    LandslideHealthResponse,
)

router = APIRouter(prefix="/landslide", tags=["landslide4sense"])

registry = LandslideModelRegistry(landslide_settings)


def _job_to_response(job) -> LandslideAnalysisResponse:
    detections = []
    geojson = None
    summary = None
    if job.result is not None:
        geojson = job.result.geojson()
        summary_dict = job.result.summary()
        summary = AnalysisSummary(**summary_dict)
        detections = [
            {
                "id": d.id,
                "geometry": d.geometry,
                "area_m2": d.area_m2,
                "area_km2": d.area_km2,
                "mean_probability": d.mean_probability,
                "max_probability": d.max_probability,
                "pixel_fraction_above_threshold": d.pixel_fraction_above_threshold,
                "confidence": d.confidence,
                "severity": d.severity,
                "centroid": {"lat": d.centroid_lat, "lon": d.centroid_lon},
                "model": d.model,
                "model_version": d.model_version,
                "detected_at": d.detected_at,
            }
            for d in job.result.detections
        ]

    return LandslideAnalysisResponse(
        analysis_id=job.id,
        status=job.status,
        mode=job.mode or landslide_settings.inference_mode,
        model_name="Landslide4Sense",
        model_version="baseline-unet",
        error=job.error,
        error_code=job.error_code,
        summary=summary,
        detections=detections,
        geojson=geojson,
    )


@router.get("/health", response_model=LandslideHealthResponse)
def landslide_health() -> LandslideHealthResponse:
    return LandslideHealthResponse(**health_payload(landslide_settings, registry))


@router.post("/analyze", response_model=LandslideAnalysisResponse, status_code=202)
async def analyze(
    demo_dataset: bool = False,
    sentinel: UploadFile | None = File(None),
    slope: UploadFile | None = File(None),
    dem: UploadFile | None = File(None),
) -> LandslideAnalysisResponse:
    if demo_dataset:
        paths = generate_demo_scene()
        sentinel_path, slope_path, dem_path = paths["sentinel"], paths["slope"], paths["dem"]
    else:
        if not (sentinel and slope and dem):
            raise HTTPException(
                status_code=400,
                detail="Provide sentinel, slope and dem files, or set demo_dataset=true.",
            )
        tmp_dir = Path(tempfile.mkdtemp(prefix="ns_landslide_upload_"))
        sentinel_path = str(tmp_dir / "sentinel.tif")
        slope_path = str(tmp_dir / "slope.tif")
        dem_path = str(tmp_dir / "dem.tif")
        for upload, dest in ((sentinel, sentinel_path), (slope, slope_path), (dem, dem_path)):
            with open(dest, "wb") as f:
                shutil.copyfileobj(upload.file, f)

    job = job_store.create()
    job_store.run_in_background(job.id, sentinel_path, slope_path, dem_path, landslide_settings, registry)
    return _job_to_response(job)


@router.get("/analysis/{analysis_id}", response_model=LandslideAnalysisResponse)
def get_analysis(analysis_id: str) -> LandslideAnalysisResponse:
    job = job_store.get(analysis_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"No analysis with id {analysis_id}.")
    return _job_to_response(job)
