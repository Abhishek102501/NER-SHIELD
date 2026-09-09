"""Smoke tests for the full pipeline: synthetic data -> train -> predict/health.
Not a substitute for evaluating on real data — these just confirm the
plumbing works and the API contracts hold.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from nershield_ml.data.synthetic import generate_synthetic_hazard_zones
from nershield_ml.inference.model_registry import ModelNotLoadedError, ModelRegistry
from nershield_ml.training.train import train


@pytest.fixture(scope="module")
def trained_model_dir(tmp_path_factory) -> Path:
    data_dir = tmp_path_factory.mktemp("data")
    model_dir = tmp_path_factory.mktemp("models")

    df = generate_synthetic_hazard_zones(n_rows=400, seed=1)
    data_path = data_dir / "synthetic_hazard_zones.csv"
    df.to_csv(data_path, index=False)

    train(data_path, model_dir=model_dir, n_splits=3)
    return model_dir


def test_registry_reports_not_loaded_when_no_artifact(tmp_path):
    registry = ModelRegistry(tmp_path / "empty")
    registry.load()
    assert registry.is_loaded is False
    with pytest.raises(ModelNotLoadedError):
        _ = registry.current


def test_registry_loads_trained_artifact(trained_model_dir):
    registry = ModelRegistry(trained_model_dir)
    registry.load()
    assert registry.is_loaded is True
    assert registry.current.version.startswith("xgb-")


SAMPLE_FEATURES = {
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


def test_predict_returns_score_band_confidence_and_factors(trained_model_dir):
    from nershield_ml.inference.predictor import predict

    registry = ModelRegistry(trained_model_dir)
    registry.load()

    result = predict(registry.current, SAMPLE_FEATURES)

    assert 0 <= result.score <= 100
    assert result.risk_band in {"Low", "Moderate", "High", "Severe"}
    assert 0 <= result.confidence <= 1
    assert len(result.factors) == 5
    assert all({"feature", "contribution"} <= f.keys() for f in result.factors)


def test_api_health_and_predict(trained_model_dir, monkeypatch):
    monkeypatch.setenv("MODEL_DIR", str(trained_model_dir))
    # config.settings is instantiated at import time — reload after the env
    # var is set so the app picks up the freshly trained model dir.
    import importlib

    from nershield_ml import config

    importlib.reload(config)

    from nershield_ml.api import main as api_main

    importlib.reload(api_main)

    from fastapi.testclient import TestClient

    with TestClient(api_main.app) as client:
        health = client.get("/health").json()
        assert health["status"] == "UP"
        assert health["model_loaded"] is True
        assert health["model_version"].startswith("xgb-")
        assert health["last_trained"] is not None

        response = client.post("/predict", json=SAMPLE_FEATURES)
        assert response.status_code == 200
        body = response.json()
        assert 0 <= body["score"] <= 100
        assert body["risk_band"] in {"Low", "Moderate", "High", "Severe"}
        assert body["model_version"] == health["model_version"]
        assert len(body["factors"]) == 5

        invalid = client.post("/predict", json={**SAMPLE_FEATURES, "slope": 900})
        assert invalid.status_code == 422
