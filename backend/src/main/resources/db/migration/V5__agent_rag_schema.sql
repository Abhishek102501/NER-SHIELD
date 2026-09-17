-- V5 - AI agent RAG knowledge-base schema, isolated in its own "agent" Postgres schema so
-- it never collides with or gets confused for the existing domain tables in "public".
--
-- pgvector is NOT installed on this project's PostgreSQL 16 instance (confirmed: zero rows
-- from `SELECT * FROM pg_available_extensions WHERE name='vector'`, and no vector.control/
-- vector.dll under the install tree — unlike PostGIS, which was present but merely not
-- enabled). `embedding` is therefore a plain `double precision[]` column; the agent-service
-- (see agent-service/src/agent_service/rag/store.py) computes cosine similarity in Python
-- rather than using pgvector's `<->` operator. Once pgvector is installed, a future
-- migration can `ALTER TABLE ... ALTER COLUMN embedding TYPE vector(N)` and the ANN index
-- can be added — no other schema change is required.
--
-- This migration creates schema only. No document content ships with it — see
-- agent-service/src/agent_service/rag/ingest.py and the project's disaster-document
-- corpus, which still needs to be populated from real, attributable sources (NDMA/NDRF/IMD
-- etc.), never fabricated.

CREATE SCHEMA IF NOT EXISTS agent;

CREATE TABLE agent.documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    issuing_organization VARCHAR(200),
    source_url VARCHAR(500),
    document_type VARCHAR(80),
    document_date DATE,
    -- "verified_source" = ingested from a known, attributable official source with a
    -- recorded source_url/issuing_organization; "unverified" = provenance incomplete.
    -- Never "verified_source" for anything without a real source_url.
    verification_status VARCHAR(24) NOT NULL DEFAULT 'unverified',
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE agent.document_chunks (
    id SERIAL PRIMARY KEY,
    document_id INT NOT NULL REFERENCES agent.documents (id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding DOUBLE PRECISION[] NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (document_id, chunk_index)
);

CREATE INDEX idx_agent_document_chunks_document_id ON agent.document_chunks (document_id);
