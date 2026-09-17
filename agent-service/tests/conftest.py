from __future__ import annotations

from agent_service.llm.base import LLMProvider, LLMResponse, LLMUnavailableError, ToolUseRequest


class FakeLLMProvider(LLMProvider):
    """Programmable fake — returns a scripted sequence of LLMResponse objects, one per call,
    so tests can drive the agent loop deterministically without a real API key.
    """

    def __init__(self, responses: list[LLMResponse]) -> None:
        self._responses = list(responses)
        self.calls: list[tuple[str, list[dict], list[dict]]] = []

    def available(self) -> bool:
        return True

    def create_message(self, system: str, messages: list[dict], tools: list[dict]) -> LLMResponse:
        self.calls.append((system, messages, tools))
        if not self._responses:
            raise LLMUnavailableError("FakeLLMProvider ran out of scripted responses.")
        return self._responses.pop(0)


def text_response(text: str) -> LLMResponse:
    return LLMResponse(stop_reason="end_turn", text=text, tool_uses=[], raw_content=[{"type": "text", "text": text}])


def tool_use_response(name: str, input_: dict, call_id: str = "call-1") -> LLMResponse:
    return LLMResponse(
        stop_reason="tool_use",
        text=None,
        tool_uses=[ToolUseRequest(id=call_id, name=name, input=input_)],
        raw_content=[{"type": "tool_use", "id": call_id, "name": name, "input": input_}],
    )
