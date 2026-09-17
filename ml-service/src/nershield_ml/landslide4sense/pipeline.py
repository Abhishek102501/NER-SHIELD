"""Orchestrates the full analyze() pipeline described in the module README:
validate -> preprocess -> tile+infer -> threshold -> clean -> polygonize ->
summarize. One function, one place that can fail, one place that decides
what "mode" actually ran.
"""

from __future__ import annotations

import logging

from nershield_ml.landslide4sense.config import LandslideSettings
from nershield_ml.landslide4sense.inference.postprocessing import (
    Detection,
    clean_mask,
    polygonize,
    to_binary_mask,
)
from nershield_ml.landslide4sense.inference.predictor import predict_probability
from nershield_ml.landslide4sense.inference.preprocessing import preprocess
from nershield_ml.landslide4sense.inference.validation import validate_inputs
from nershield_ml.landslide4sense.model.registry import LandslideModelRegistry

logger = logging.getLogger("nershield_ml.landslide4sense")


class AnalysisResult:
    def __init__(self, detections: list[Detection], mode: str, crs: str):
        self.detections = detections
        self.mode = mode
        self.crs = crs

    def summary(self) -> dict:
        by_severity = {"critical": 0, "high": 0, "moderate": 0, "low": 0}
        for d in self.detections:
            by_severity[d.severity] += 1
        return {
            "detections": len(self.detections),
            "affected_area_km2": round(sum(d.area_km2 for d in self.detections), 4),
            **by_severity,
        }

    def geojson(self) -> dict:
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": d.geometry,
                    "properties": {
                        "id": d.id,
                        "area_m2": d.area_m2,
                        "area_km2": d.area_km2,
                        "confidence": d.confidence,
                        "severity": d.severity,
                        "model": d.model,
                        "model_version": d.model_version,
                        "detected_at": d.detected_at,
                    },
                }
                for d in self.detections
            ],
        }


def run_analysis(
    sentinel_path: str,
    slope_path: str,
    dem_path: str,
    settings: LandslideSettings,
    registry: LandslideModelRegistry,
) -> AnalysisResult:
    """Raises `LandslideValidationError` (input problems) or `RuntimeError`
    (real mode requested with no checkpoint) — callers (the API job runner)
    catch these and record a `failed` status with the error code, never
    swallow them into a fake `completed` result.
    """
    validated = validate_inputs(sentinel_path, slope_path, dem_path)
    scene = preprocess(validated)

    probability, mode = predict_probability(scene.array, settings, registry)

    mask = to_binary_mask(probability, settings.threshold)
    mask = clean_mask(mask)

    detections = polygonize(probability, mask, scene.crs, scene.transform, settings)

    logger.info(
        "Landslide analysis complete: mode=%s detections=%d crs=%s", mode, len(detections), scene.crs
    )
    return AnalysisResult(detections=detections, mode=mode, crs=scene.crs)
