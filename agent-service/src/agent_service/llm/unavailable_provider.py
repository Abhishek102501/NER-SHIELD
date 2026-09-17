from __future__ import annotations

from .base import LLMProvider, LLMResponse, LLMUnavailableError


class UnavailableProvider(LLMProvider):
    """Active when no LLM provider is configured (LLM_PROVIDER=none, or missing credentials).
    Every call raises — this is the mechanism that makes "no fabricated AI response" a
    structural guarantee rather than a convention: there is no code path in this class that
    can return a synthesized answer.
    """

    def __init__(self, reason: str) -> None:
        self._reason = reason

    def available(self) -> bool:
        return False

    def create_message(self, system: str, messages: list[dict], tools: list[dict]) -> LLMResponse:
        raise LLMUnavailableError(self._reason)
