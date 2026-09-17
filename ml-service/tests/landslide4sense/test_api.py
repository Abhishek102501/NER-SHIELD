import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from nershield_ml.api.main import app
from nershield_ml.landslide4sense import api as landslide_api

CHECKPOINT_PATH = Path(__file__).parent.parent.parent / "models" / "landslide" / "landslide4sense_unet.pt"


def _poll_until_done(client: TestClient, analysis_id: str, timeout_s: float = 10.0) -> dict:
    deadline = time.time() + timeout_s
    body = {}
    while time.time() < deadline:
        resp = client.get(f"/landslide/analysis/{analysis_id}")
        body = resp.json()
        if body["status"] in ("completed", "failed"):
            return body
        time.sleep(0.1)
    raise AssertionError(f"analysis {analysis_id} did not finish in {timeout_s}s: {body}")


def test_health_endpoint_reports_mock_mode():
    with TestClient(app) as client:
        resp = client.get("/landslide/health")
        assert resp.status_code == 200
        body = resp.json()
        assert body["model"] == "Landslide4Sense"
        assert body["inference_mode"] in ("real", "mock")


def test_demo_analyze_end_to_end_in_mock_mode(monkeypatch):
    # Force mock mode for this test regardless of this environment's actual
    # LANDSLIDE_INFERENCE_MODE (this repo now has a real checkpoint wired in
    # for local testing — see ml-service/.env — so this test's mock-mode
    # assumption must be pinned explicitly rather than relying on ambient
    # settings, same lesson as NortheastRainfallSettings' BaseSettings gotcha).
    monkeypatch.setattr(landslide_api.landslide_settings, "inference_mode", "mock")
    with TestClient(app) as client:
        resp = client.post("/landslide/analyze", params={"demo_dataset": "true"})
        assert resp.status_code == 202
        analysis_id = resp.json()["analysis_id"]
        assert resp.json()["status"] in ("queued", "preprocessing", "running")

        result = _poll_until_done(client, analysis_id)
        assert result["status"] == "completed"
        assert result["mode"] == "mock"  # never silently claims to be "real"
        assert result["geojson"]["type"] == "FeatureCollection"
        assert result["summary"]["detections"] == len(result["detections"])


@pytest.mark.skipif(
    not CHECKPOINT_PATH.exists(),
    reason="No trained checkpoint present locally (gitignored) — see test_real_inference.py.",
)
def test_demo_analyze_reports_real_mode_when_a_real_checkpoint_is_loaded(monkeypatch):
    """Complements test_demo_analyze_end_to_end_in_mock_mode: when a real
    checkpoint IS loaded and inference_mode=real, the API must honestly
    report mode="real" — even though demo_dataset=true still feeds it
    SYNTHETIC imagery (see demo_data.py), which is why this only proves the
    real model ran, not that the result reflects real-world conditions.
    """
    monkeypatch.setattr(landslide_api.landslide_settings, "inference_mode", "real")
    if not landslide_api.registry.is_loaded:
        landslide_api.registry.settings.model_path = CHECKPOINT_PATH
        landslide_api.registry.settings.device = "cpu"
        landslide_api.registry.load()
    assert landslide_api.registry.is_loaded, landslide_api.registry.load_error

    with TestClient(app) as client:
        resp = client.post("/landslide/analyze", params={"demo_dataset": "true"})
        assert resp.status_code == 202
        analysis_id = resp.json()["analysis_id"]

        result = _poll_until_done(client, analysis_id)
        assert result["status"] == "completed"
        assert result["mode"] == "real"


def test_analyze_without_files_or_demo_flag_is_rejected():
    with TestClient(app) as client:
        resp = client.post("/landslide/analyze")
        assert resp.status_code == 400


def test_unknown_analysis_id_returns_404():
    with TestClient(app) as client:
        resp = client.get("/landslide/analysis/LSA-does-not-exist")
        assert resp.status_code == 404
