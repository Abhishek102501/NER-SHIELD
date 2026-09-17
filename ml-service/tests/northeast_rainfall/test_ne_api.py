from fastapi.testclient import TestClient

from nershield_ml.api.main import app


def test_health_endpoint():
    with TestClient(app) as client:
        resp = client.get("/rainfall/health")
        assert resp.status_code == 200
        body = resp.json()
        assert body["model"] == "northeast_rainfall_lstm"


def test_demo_forecast_end_to_end():
    with TestClient(app) as client:
        resp = client.post("/rainfall/forecast/demo")
        assert resp.status_code == 200
        body = resp.json()
        assert body["mode"] in ("real", "demo")
        assert body["is_generalized"] is False
        assert body["geographic_scope"] == "North East India"
        assert len(body["forecast"]) == 12
        assert body["interval_minutes"] == 60


def test_forecast_rejects_insufficient_history():
    with TestClient(app) as client:
        resp = client.post("/rainfall/forecast", json={"historical": []})
        assert resp.status_code == 422
        assert resp.json()["detail"]["error_code"] == "INSUFFICIENT_HISTORY"


def test_explain_demo_end_to_end_or_clean_503_without_xgb():
    """This environment's own `.env` may or may not have
    NORTHEAST_RAINFALL_XGB_MODEL_PATH set to a present checkpoint (models/ is
    gitignored) — either a working explanation or a clean 503 is correct;
    a 500 or a fabricated explanation is not.
    """
    with TestClient(app) as client:
        resp = client.post("/rainfall/explain/demo")
        assert resp.status_code in (200, 503)
        if resp.status_code == 200:
            body = resp.json()
            assert body["horizon"] == 0
            assert body["lead_time_min"] == 60
            assert len(body["contributions"]) > 0
            assert body["additivity_error"] < 1e-4
            assert isinstance(body["narrative"], str) and len(body["narrative"]) > 0


def test_explain_demo_rejects_out_of_range_horizon():
    with TestClient(app) as client:
        resp = client.post("/rainfall/explain/demo", params={"horizon": 99})
        assert resp.status_code in (422, 503)  # 503 if no explainer loaded at all


def test_explain_rejects_insufficient_history():
    with TestClient(app) as client:
        resp = client.post("/rainfall/explain", json={"historical": []})
        assert resp.status_code == 422
