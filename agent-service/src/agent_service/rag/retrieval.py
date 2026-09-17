from __future__ import annotations

from dataclasses import dataclass

from .embeddings import EmbeddingProvider, EmbeddingUnavailableError
from .store import ChunkMatch, RagStore, RagStoreUnavailableError


@dataclass
class RetrievalResult:
    available: bool
    matches: list[ChunkMatch]
    reason: str | None = None


def retrieve(
    query: str, embedding_provider: EmbeddingProvider, store: RagStore | None, top_k: int = 5
) -> RetrievalResult:
    """Never fabricates a retrieved document. Any missing configuration or upstream failure
    returns `available=False` with a `reason` — the agent must treat that as "no knowledge
    base available", not as "zero relevant documents exist".
    """
    if store is None:
        return RetrievalResult(available=False, matches=[], reason="RAG database is not configured.")
    if not embedding_provider.available():
        return RetrievalResult(available=False, matches=[], reason="No embedding provider configured.")

    try:
        query_embedding = embedding_provider.embed([query])[0]
    except EmbeddingUnavailableError as exc:
        return RetrievalResult(available=False, matches=[], reason=str(exc))

    try:
        matches = store.search(query_embedding, top_k=top_k)
    except RagStoreUnavailableError as exc:
        return RetrievalResult(available=False, matches=[], reason=str(exc))

    return RetrievalResult(available=True, matches=matches)
