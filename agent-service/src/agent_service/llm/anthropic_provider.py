from __future__ import annotations

import anthropic

from .base import LLMProvider, LLMResponse, LLMUnavailableError, ToolUseRequest


class AnthropicProvider(LLMProvider):
    """Real Anthropic Messages API client with tool use. Never fabricates a response —
    any upstream failure raises LLMUnavailableError, which the agent loop turns into an
    honest `available: false` result instead of a made-up answer.
    """

    def __init__(self, api_key: str, model: str) -> None:
        self._model = model
        self._client = anthropic.Anthropic(api_key=api_key) if api_key else None

    def available(self) -> bool:
        return self._client is not None

    def create_message(self, system: str, messages: list[dict], tools: list[dict]) -> LLMResponse:
        if not self._client:
            raise LLMUnavailableError("Anthropic provider has no API key configured.")
        try:
            response = self._client.messages.create(
                model=self._model,
                max_tokens=1024,
                system=system,
                messages=messages,
                tools=tools if tools else anthropic.NOT_GIVEN,
            )
        except anthropic.APIError as exc:
            raise LLMUnavailableError(f"Anthropic API call failed: {exc}") from exc

        text_parts: list[str] = []
        tool_uses: list[ToolUseRequest] = []
        for block in response.content:
            if block.type == "text":
                text_parts.append(block.text)
            elif block.type == "tool_use":
                tool_uses.append(ToolUseRequest(id=block.id, name=block.name, input=block.input))

        return LLMResponse(
            stop_reason=response.stop_reason or "end_turn",
            text="\n".join(text_parts) if text_parts else None,
            tool_uses=tool_uses,
            raw_content=[block.model_dump() for block in response.content],
        )
