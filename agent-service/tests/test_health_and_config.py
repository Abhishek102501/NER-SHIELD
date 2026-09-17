from fastapi.testclient import TestClient

from agent_service.main import app


def test_health_reports_unconfigured_by_default(monkeypatch):
    monkeypatch.delenv("LLM_PROVIDER", raising=False)
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "up"
        assert body["llmConfigured"] is False
        assert body["embeddingsConfigured"] is False


def test_query_without_llm_configured_reports_unavailable_not_fabricated():
    with TestClient(app) as client:
        response = client.post("/query", json={"query": "What is the weather in Gangtok?"})
        assert response.status_code == 200
        body = response.json()
        assert body["available"] is False
        assert body["answer"] is None
        assert "LLM_PROVIDER" in body["reason"]


def test_query_requires_query_or_confirmed_action():
    with TestClient(app) as client:
        response = client.post("/query", json={})
        assert response.status_code == 200
        body = response.json()
        assert body["available"] is False
        assert "confirmedAction" in body["reason"] or "query" in body["reason"]
