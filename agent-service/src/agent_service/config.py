"""Environment-driven configuration. No secrets have defaults; anything security-sensitive
must be supplied explicitly or the relevant subsystem reports itself unavailable rather than
silently degrading to a fake/insecure default.
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", extra="ignore")

    # --- Service ---
    agent_service_host: str = "0.0.0.0"
    agent_service_port: int = 8100

    # --- Backend (the Spring Boot API — sole source of truth for reads/writes) ---
    backend_base_url: str = "http://localhost:8085"
    backend_request_timeout_seconds: float = 8.0

    # --- LLM provider ---
    # "anthropic" or "none". "none" (the default) means the agent honestly reports
    # unavailable rather than fabricating a response — see llm/factory.py.
    llm_provider: str = "none"
    llm_api_key: str = ""
    llm_model: str = "claude-sonnet-5"
    llm_max_tool_iterations: int = 6

    # --- Embeddings (for RAG ingestion + query) ---
    # "anthropic-voyage" (Voyage AI, Anthropic's recommended embeddings partner) or "none".
    embedding_provider: str = "none"
    embedding_api_key: str = ""
    embedding_model: str = "voyage-3"

    # --- RAG / vector store (same PostgreSQL instance, isolated "agent" schema) ---
    rag_database_url: str = ""

    def llm_configured(self) -> bool:
        return self.llm_provider.lower() == "anthropic" and bool(self.llm_api_key)

    def embeddings_configured(self) -> bool:
        return self.embedding_provider.lower() != "none" and bool(self.embedding_api_key)

    def rag_configured(self) -> bool:
        return bool(self.rag_database_url)


def get_settings() -> Settings:
    return Settings()
