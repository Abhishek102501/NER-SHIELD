import httpx
import pytest
import respx

from agent_service.rag.embeddings import UnavailableEmbeddingProvider
from agent_service.tools.backend_client import BackendClient
from agent_service.tools.registry import ToolExecutionError, build_tools, to_anthropic_schema


@pytest.fixture
def backend():
    client = BackendClient("http://backend.test", timeout_seconds=2.0)
    yield client
    client.close()


@pytest.fixture
def tools(backend):
    return build_tools(backend, UnavailableEmbeddingProvider("no embeddings in tests"), rag_store=None)


def test_every_tool_has_a_valid_typed_schema(tools):
    schemas = to_anthropic_schema(tools)
    names = {s["name"] for s in schemas}
    assert names == {
        "get_weather",
        "get_rainfall_forecast",
        "get_gis_layer",
        "get_incidents",
        "get_threats",
        "get_risk_zones",
        "get_alerts",
        "get_response_units",
        "search_knowledge_base",
        "create_dispatch",
    }
    for schema in schemas:
        assert schema["input_schema"]["type"] == "object"


def test_read_tools_are_not_marked_write_and_dispatch_is(tools):
    by_name = {t.name: t for t in tools}
    assert by_name["get_weather"].is_write is False
    assert by_name["get_incidents"].is_write is False
    assert by_name["create_dispatch"].is_write is True


@respx.mock
def test_get_weather_tool_executes_against_backend(tools):
    by_name = {t.name: t for t in tools}
    respx.get("http://backend.test/api/weather/current").mock(
        return_value=httpx.Response(200, json={"available": True, "temperatureCelsius": 21.5})
    )
    result = by_name["get_weather"].handler({"latitude": 27.14, "longitude": 88.53})
    assert result["result"]["temperatureCelsius"] == 21.5


@respx.mock
def test_get_incidents_tool_filters_by_severity(tools):
    by_name = {t.name: t for t in tools}
    respx.get("http://backend.test/api/incidents").mock(
        return_value=httpx.Response(
            200,
            json={
                "incidents": [
                    {"id": "inc-1", "severity": "critical"},
                    {"id": "inc-2", "severity": "low"},
                ]
            },
        )
    )
    result = by_name["get_incidents"].handler({"severity": "critical"})
    assert [i["id"] for i in result["result"]] == ["inc-1"]


@respx.mock
def test_tool_execution_raises_on_backend_failure(tools):
    by_name = {t.name: t for t in tools}
    respx.get("http://backend.test/api/threats").mock(return_value=httpx.Response(503))
    with pytest.raises(ToolExecutionError):
        by_name["get_threats"].handler({})


def test_search_knowledge_base_reports_unavailable_without_embeddings(tools):
    by_name = {t.name: t for t in tools}
    result = by_name["search_knowledge_base"].handler({"query": "landslide preparedness"})
    assert result["available"] is False
    assert result["matches"] == []
