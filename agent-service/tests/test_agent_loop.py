import httpx
import pytest
import respx

from agent_service.agent.loop import run_agent
from agent_service.rag.embeddings import UnavailableEmbeddingProvider
from agent_service.tools.backend_client import BackendClient
from agent_service.tools.registry import build_tools

from .conftest import FakeLLMProvider, text_response, tool_use_response


@pytest.fixture
def backend():
    client = BackendClient("http://backend.test", timeout_seconds=2.0)
    yield client
    client.close()


@pytest.fixture
def tools(backend):
    return build_tools(backend, UnavailableEmbeddingProvider("no embeddings in tests"), rag_store=None)


def test_final_text_answer_is_grounded_and_reports_tools_used(tools):
    with respx.mock:
        respx.get("http://backend.test/api/weather/current").mock(
            return_value=httpx.Response(200, json={"available": True, "temperatureCelsius": 19.0})
        )
        llm = FakeLLMProvider(
            [
                tool_use_response("get_weather", {"latitude": 27.14, "longitude": 88.53}),
                text_response("It is currently 19°C."),
            ]
        )
        result = run_agent("What's the weather?", llm, tools, max_iterations=6)

    assert result.available is True
    assert result.answer == "It is currently 19°C."
    assert "Weather" in result.toolsUsed
    assert result.sources[0].dataOrigin == "REAL_EXTERNAL"


def test_dispatch_tool_call_never_executes_and_requires_confirmation(tools, backend):
    # Prove the write tool is never invoked: point create_dispatch at a URL that would
    # raise if actually called (nothing is mocked there), and assert no request happens.
    with respx.mock:
        dispatch_route = respx.post("http://backend.test/api/response/dispatch").mock(
            return_value=httpx.Response(200, json={"id": "should-not-be-called"})
        )
        llm = FakeLLMProvider(
            [
                tool_use_response(
                    "create_dispatch",
                    {"incidentId": "inc-1042", "unitId": "unit-alpha", "reason": "critical slope failure"},
                )
            ]
        )
        result = run_agent("Dispatch a unit to the NH-10 incident.", llm, tools, max_iterations=6)

        assert dispatch_route.call_count == 0, "create_dispatch must never execute automatically"

    assert result.available is True
    assert result.requiresConfirmation is True
    assert result.proposedAction is not None
    assert result.proposedAction.incidentId == "inc-1042"
    assert result.proposedAction.unitId == "unit-alpha"


def test_running_out_of_iterations_returns_a_controlled_low_confidence_answer(tools):
    with respx.mock:
        respx.get("http://backend.test/api/threats").mock(return_value=httpx.Response(200, json={"events": []}))
        llm = FakeLLMProvider([tool_use_response("get_threats", {}) for _ in range(3)])
        result = run_agent("Loop forever", llm, tools, max_iterations=3)

    assert result.available is True
    assert result.confidence == "low"
    assert "could not finish reasoning" in result.answer
