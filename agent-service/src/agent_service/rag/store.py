"""Vector storage for the RAG knowledge base.

This environment's PostgreSQL 16 install does NOT have the pgvector extension available
(confirmed: `SELECT * FROM pg_available_extensions WHERE name='vector'` returns zero rows,
and no vector.control/vector.dll exist under the PostgreSQL install tree — unlike PostGIS,
which was present but merely not enabled, pgvector is genuinely not installed here and
would need an administrator to add the extension binaries).

Per the task's instruction ("use pgvector IF the extension is available"), this store uses
a functionally-equivalent fallback instead: embeddings are stored as plain
`double precision[]` columns (native Postgres, no extension needed), and cosine similarity
is computed in Python at query time over the (typically small) document-chunk corpus. This
is real, unfabricated similarity search — just without an ANN index, which only matters at
a scale this project's corpus is nowhere near.

Migrating to real pgvector later requires no schema redesign: once the extension is
installed, change `embedding double precision[]` to `embedding vector(N)` in a new Flyway
migration, backfill, and swap this file's `_cosine_similarity` scan for a `<->` ORDER BY
query — everything above this file (retrieval.py, tools) is unaffected.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import psycopg2
import psycopg2.extras


@dataclass
class ChunkMatch:
    chunk_id: int
    document_id: int
    chunk_text: str
    similarity: float
    title: str
    issuing_organization: str | None
    source_url: str | None
    document_type: str | None
    document_date: str | None
    verification_status: str


class RagStoreUnavailableError(RuntimeError):
    pass


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b, strict=False))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


class RagStore:
    def __init__(self, database_url: str) -> None:
        self._database_url = database_url

    def _connect(self):
        try:
            return psycopg2.connect(self._database_url)
        except psycopg2.OperationalError as exc:
            raise RagStoreUnavailableError(f"Could not connect to RAG database: {exc}") from exc

    def insert_document(
        self,
        title: str,
        issuing_organization: str | None,
        source_url: str | None,
        document_type: str | None,
        document_date: str | None,
        verification_status: str,
    ) -> int:
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO agent.documents
                    (title, issuing_organization, source_url, document_type, document_date,
                     verification_status, ingested_at)
                VALUES (%s, %s, %s, %s, %s, %s, now())
                RETURNING id
                """,
                (title, issuing_organization, source_url, document_type, document_date, verification_status),
            )
            document_id = cur.fetchone()[0]
            conn.commit()
            return document_id

    def insert_chunk(self, document_id: int, chunk_index: int, chunk_text: str, embedding: list[float]) -> None:
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO agent.document_chunks (document_id, chunk_index, chunk_text, embedding)
                VALUES (%s, %s, %s, %s)
                """,
                (document_id, chunk_index, chunk_text, embedding),
            )
            conn.commit()

    def search(self, query_embedding: list[float], top_k: int = 5) -> list[ChunkMatch]:
        with self._connect() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT c.id AS chunk_id, c.document_id, c.chunk_text, c.embedding,
                       d.title, d.issuing_organization, d.source_url, d.document_type,
                       d.document_date, d.verification_status
                FROM agent.document_chunks c
                JOIN agent.documents d ON d.id = c.document_id
                """
            )
            rows = cur.fetchall()

        scored = [
            ChunkMatch(
                chunk_id=row["chunk_id"],
                document_id=row["document_id"],
                chunk_text=row["chunk_text"],
                similarity=_cosine_similarity(query_embedding, list(row["embedding"])),
                title=row["title"],
                issuing_organization=row["issuing_organization"],
                source_url=row["source_url"],
                document_type=row["document_type"],
                document_date=str(row["document_date"]) if row["document_date"] else None,
                verification_status=row["verification_status"],
            )
            for row in rows
        ]
        scored.sort(key=lambda m: m.similarity, reverse=True)
        return scored[:top_k]

    def document_count(self) -> int:
        with self._connect() as conn, conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM agent.documents")
            return cur.fetchone()[0]
