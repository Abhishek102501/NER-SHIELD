"""Embedding provider abstraction. Swappable via EMBEDDING_PROVIDER — nothing else in the
RAG pipeline needs to change to switch providers, matching the same pattern as
llm/factory.py.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

import httpx


class EmbeddingUnavailableError(RuntimeError):
    pass


class EmbeddingProvider(ABC):
    @abstractmethod
    def available(self) -> bool: ...

    @abstractmethod
    def embed(self, texts: list[str]) -> list[list[float]]:
        """@raises EmbeddingUnavailableError if not configured or the upstream call fails."""


class UnavailableEmbeddingProvider(EmbeddingProvider):
    def __init__(self, reason: str) -> None:
        self._reason = reason

    def available(self) -> bool:
        return False

    def embed(self, texts: list[str]) -> list[list[float]]:
        raise EmbeddingUnavailableError(self._reason)


class VoyageEmbeddingProvider(EmbeddingProvider):
    """Real Voyage AI embeddings (Anthropic's recommended embedding partner) via their
    plain REST API — no SDK dependency needed. https://docs.voyageai.com/reference/embeddings-api
    """

    _ENDPOINT = "https://api.voyageai.com/v1/embeddings"

    def __init__(self, api_key: str, model: str) -> None:
        self._api_key = api_key
        self._model = model

    def available(self) -> bool:
        return bool(self._api_key)

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not self._api_key:
            raise EmbeddingUnavailableError("Voyage embedding provider has no API key configured.")
        try:
            response = httpx.post(
                self._ENDPOINT,
                headers={"Authorization": f"Bearer {self._api_key}"},
                json={"input": texts, "model": self._model},
                timeout=15.0,
            )
            response.raise_for_status()
            data = response.json()
            return [item["embedding"] for item in data["data"]]
        except (httpx.HTTPError, KeyError) as exc:
            raise EmbeddingUnavailableError(f"Voyage embeddings call failed: {exc}") from exc


def build_embedding_provider(provider: str, api_key: str, model: str) -> EmbeddingProvider:
    provider = provider.lower()
    if provider == "voyage":
        if not api_key:
            return UnavailableEmbeddingProvider("EMBEDDING_PROVIDER=voyage but EMBEDDING_API_KEY is not set.")
        return VoyageEmbeddingProvider(api_key=api_key, model=model)
    if provider == "none":
        return UnavailableEmbeddingProvider(
            "No embedding provider configured. Set EMBEDDING_PROVIDER=voyage and"
            " EMBEDDING_API_KEY to enable knowledge-base ingestion/retrieval."
        )
    return UnavailableEmbeddingProvider(f"Unknown EMBEDDING_PROVIDER '{provider}'.")
