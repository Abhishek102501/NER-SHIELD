"""FastAPI app: POST /predict, GET /health. No fabricated scores — if no
model artifact is loaded, both endpoints report that honestly rather than
inventing a number.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from nershield_ml.api.schemas import HazardZoneFeatures, HealthResponse, PredictResponse
from nershield_ml.config import settings
from nershield_ml.inference.model_registry import ModelNotLoadedError, ModelRegistry
from nershield_ml.inference.predictor import predict as run_predict
from nershield_ml.landslide4sense.api import registry as landslide_registry
from nershield_ml.landslide4sense.api import router as landslide_router
from nershield_ml.northeast_rainfall.api import registry as rainfall_registry
from nershield_ml.northeast_rainfall.api import router as rainfall_router

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger("nershield_ml")

registry = ModelRegistry(settings.model_dir)


@asynccontextmanager
async def lifespan(_: FastAPI):
    registry.load()
    if registry.is_loaded:
        logger.info("Loaded model %s", registry.current.version)
    else:
        logger.warning(
            "No model artifact found in %s — /predict will return 503 until "
            "one is trained.",
            settings.model_dir,
        )

    landslide_registry.load()
    if landslide_registry.is_loaded:
        logger.info("Loaded Landslide4Sense checkpoint on %s", landslide_registry.current.device)
    else:
        logger.warning(
            "Landslide4Sense checkpoint not loaded (%s) — running in mode=%s.",
            landslide_registry.load_error,
            landslide_registry.settings.inference_mode,
        )

    rainfall_registry.load()
    if rainfall_registry.is_loaded:
        logger.info("Loaded North East rainfall checkpoint on %s", rainfall_registry.current.device)
    else:
        logger.warning(
            "North East rainfall checkpoint not loaded (%s) — running in mode=%s.",
            rainfall_registry.load_error,
            rainfall_registry.settings.inference_mode,
        )
    yield


app = FastAPI(title="NER-SHIELD ML Service", version="0.1.0", lifespan=lifespan)
app.include_router(landslide_router)
app.include_router(rainfall_router)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    if not registry.is_loaded:
        return HealthResponse(status="DOWN", model_loaded=False)

    loaded = registry.current
    return HealthResponse(
        status="UP",
        model_loaded=True,
        model_version=loaded.version,
        last_trained=loaded.trained_at,
    )


@app.post("/predict", response_model=PredictResponse)
def predict(features: HazardZoneFeatures) -> PredictResponse:
    try:
        loaded = registry.current
    except ModelNotLoadedError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    result = run_predict(loaded, features.model_dump())

    return PredictResponse(
        score=result.score,
        risk_band=result.risk_band,
        confidence=result.confidence,
        model_version=loaded.version,
        factors=result.factors,
    )
