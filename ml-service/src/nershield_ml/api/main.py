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
    yield


app = FastAPI(title="NER-SHIELD ML Service", version="0.1.0", lifespan=lifespan)


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
