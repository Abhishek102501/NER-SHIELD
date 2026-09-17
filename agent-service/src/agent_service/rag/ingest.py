"""Document ingestion for the disaster-management knowledge base.

Deliberately NOT pre-populated: no document content ships with this change. The corpus
must be filled in by actually downloading real, attributable material (NDMA/NDRF/IMD
guidelines, official government disaster-management authority publications) and running
this ingester against it — never by inventing text and labeling it as a real source.

Usage (once EMBEDDING_PROVIDER/EMBEDDING_API_KEY/RAG_DATABASE_URL are configured):

    python -m agent_service.rag.ingest \\
        --title "NDMA Guidelines on Landslide Management" \\
        --organization "National Disaster Management Authority" \\
        --source-url "https://ndma.gov.in/..." \\
        --document-type "guideline" \\
        --document-date 2024-01-01 \\
        --file path/to/document.txt
"""

from __future__ import annotations

import argparse
import sys

from ..config import get_settings
from .embeddings import EmbeddingUnavailableError, build_embedding_provider
from .store import RagStore, RagStoreUnavailableError

_CHUNK_SIZE_CHARS = 1200
_CHUNK_OVERLAP_CHARS = 150


def chunk_text(text: str) -> list[str]:
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: list[str] = []
    current = ""
    for paragraph in paragraphs:
        if len(current) + len(paragraph) + 1 <= _CHUNK_SIZE_CHARS:
            current = f"{current}\n{paragraph}".strip()
        else:
            if current:
                chunks.append(current)
            current = paragraph
    if current:
        chunks.append(current)
    return chunks


def ingest_document(
    *,
    title: str,
    issuing_organization: str | None,
    source_url: str | None,
    document_type: str | None,
    document_date: str | None,
    text: str,
    verification_status: str = "verified_source",
) -> int:
    settings = get_settings()

    if not settings.rag_configured():
        raise RagStoreUnavailableError("RAG_DATABASE_URL is not configured — cannot ingest.")

    embedding_provider = build_embedding_provider(
        settings.embedding_provider, settings.embedding_api_key, settings.embedding_model
    )
    if not embedding_provider.available():
        raise EmbeddingUnavailableError(
            "No embedding provider configured — set EMBEDDING_PROVIDER and EMBEDDING_API_KEY."
        )

    store = RagStore(settings.rag_database_url)
    document_id = store.insert_document(
        title=title,
        issuing_organization=issuing_organization,
        source_url=source_url,
        document_type=document_type,
        document_date=document_date,
        verification_status=verification_status,
    )

    chunks = chunk_text(text)
    embeddings = embedding_provider.embed(chunks)
    for index, (chunk, embedding) in enumerate(zip(chunks, embeddings, strict=True)):
        store.insert_chunk(document_id, index, chunk, embedding)

    return document_id


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--title", required=True)
    parser.add_argument("--organization", default=None)
    parser.add_argument("--source-url", default=None)
    parser.add_argument("--document-type", default=None)
    parser.add_argument("--document-date", default=None, help="YYYY-MM-DD")
    parser.add_argument("--file", required=True, help="Path to a plain-text extract of the document")
    args = parser.parse_args()

    with open(args.file, encoding="utf-8") as f:
        text = f.read()

    try:
        document_id = ingest_document(
            title=args.title,
            issuing_organization=args.organization,
            source_url=args.source_url,
            document_type=args.document_type,
            document_date=args.document_date,
            text=text,
        )
    except (RagStoreUnavailableError, EmbeddingUnavailableError) as exc:
        print(f"Ingestion failed: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc

    print(f"Ingested document id={document_id}: {args.title}")


if __name__ == "__main__":
    main()
