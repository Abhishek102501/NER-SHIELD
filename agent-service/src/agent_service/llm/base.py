"""Provider-agnostic LLM interface. Adding a second provider (e.g. OpenAI) means writing
one new class here and registering it in factory.py — nothing else in the agent changes.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class ToolUseRequest:
    """One tool call the model asked for."""

    id: str
    name: str
    input: dict


@dataclass
class LLMResponse:
    stop_reason: str  # "tool_use" | "end_turn" | "max_tokens" | ...
    text: str | None
    tool_uses: list[ToolUseRequest] = field(default_factory=list)
    # Raw provider-format content blocks, needed to replay the assistant turn back into
    # the next request's message history (tool-use conversations require the exact
    # original blocks, not a reconstruction). Necessarily provider-shaped; swapping
    # providers means the agent loop's message history format changes too, which is an
    # acceptable coupling for a single-provider implementation — see AnthropicProvider.
    raw_content: list[dict] = field(default_factory=list)


class LLMUnavailableError(RuntimeError):
    """Raised when a provider is asked to run without being configured/reachable."""


class LLMProvider(ABC):
    @abstractmethod
    def available(self) -> bool:
        """Whether this provider is actually configured and usable right now."""

    @abstractmethod
    def create_message(
        self, system: str, messages: list[dict], tools: list[dict]
    ) -> LLMResponse:
        """
        Sends one turn to the model.

        @raises LLMUnavailableError if not configured, or the upstream call fails.
        """
