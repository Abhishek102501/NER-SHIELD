from agent_service.rag.embeddings import UnavailableEmbeddingProvider
from agent_service.rag.retrieval import retrieve


def test_retrieval_unavailable_without_rag_store():
    result = retrieve("landslide preparedness", UnavailableEmbeddingProvider("no key"), store=None)
    assert result.available is False
    assert result.matches == []
    assert "not configured" in result.reason


def test_retrieval_unavailable_without_embedding_provider():
    class DummyStore:
        pass

    result = retrieve("landslide preparedness", UnavailableEmbeddingProvider("no key"), store=DummyStore())
    assert result.available is False
    assert result.matches == []
    assert "embedding" in result.reason.lower()
