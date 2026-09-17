from __future__ import annotations

from ..config import Settings
from .anthropic_provider import AnthropicProvider
from .base import LLMProvider
from .unavailable_provider import UnavailableProvider


def build_llm_provider(settings: Settings) -> LLMProvider:
    provider = settings.llm_provider.lower()

    if provider == "anthropic":
        if not settings.llm_api_key:
            return UnavailableProvider(
                "LLM_PROVIDER=anthropic but LLM_API_KEY is not set."
            )
        return AnthropicProvider(api_key=settings.llm_api_key, model=settings.llm_model)

    if provider == "none":
        return UnavailableProvider(
            "No LLM provider configured. Set LLM_PROVIDER=anthropic and LLM_API_KEY to"
            " enable the agent."
        )

    return UnavailableProvider(f"Unknown LLM_PROVIDER '{settings.llm_provider}'.")
