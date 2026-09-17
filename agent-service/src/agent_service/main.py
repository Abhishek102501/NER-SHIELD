from __future__ import annotations

from contextlib import asynccontextmanager
from dataclasses import asdict

from fastapi import FastAPI
from pydantic import BaseModel

from .agent.loop import run_agent
from .agent.response import AgentResult
from .config import Settings, get_settings
from .llm.factory import build_llm_provider
from .rag.embeddings import build_embedding_provider
from .rag.store import RagStore
from .tools.backend_client import BackendClient, BackendUnavailableError
from .tools.registry import build_tools

_state: dict = {}


def _build_state(settings: Settings) -> dict:
    backend = BackendClient(settings.backend_base_url, settings.backend_request_timeout_seconds)
    embedding_provider = build_embedding_provider(
        settings.embedding_provider, settings.embedding_api_key, settings.embedding_model
    )
    rag_store = RagStore(settings.rag_database_url) if settings.rag_configured() else None
    llm = build_llm_provider(settings)
    tools = build_tools(backend, embedding_provider, rag_store)
    return {
        "settings": settings,
        "backend": backend,
        "embedding_provider": embedding_provider,
        "rag_store": rag_store,
        "llm": llm,
        "tools": tools,
    }


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    _state.update(_build_state(settings))
    yield
    _state["backend"].close()


app = FastAPI(title="NER-SHIELD Agent Service", lifespan=lifespan)


class ProposedActionModel(BaseModel):
    type: str
    incidentId: str
    unitId: str
    reason: str


class ConfirmedActionModel(BaseModel):
    type: str
    incidentId: str
    unitId: str
    reason: str
    priority: str = "High"


class QueryRequest(BaseModel):
    query: str | None = None
    confirmedAction: ConfirmedActionModel | None = None


class SourceEntryModel(BaseModel):
    tool: str
    dataOrigin: str
    summary: str


class AgentResponseModel(BaseModel):
    available: bool
    answer: str | None = None
    confidence: str | None = None
    toolsUsed: list[str] = []
    sources: list[SourceEntryModel] = []
    retrievedDocuments: list[dict] = []
    recommendations: list[str] = []
    requiresConfirmation: bool = False
    proposedAction: ProposedActionModel | None = None
    reason: str | None = None


def _to_model(result: AgentResult) -> AgentResponseModel:
    data = asdict(result)
    return AgentResponseModel.model_validate(data)


@app.get("/health")
def health() -> dict:
    settings: Settings = _state["settings"]
    return {
        "status": "up",
        "llmConfigured": settings.llm_configured(),
        "embeddingsConfigured": settings.embeddings_configured(),
        "ragConfigured": settings.rag_configured(),
        "backendBaseUrl": settings.backend_base_url,
    }


@app.post("/query", response_model=AgentResponseModel)
def query(request: QueryRequest) -> AgentResponseModel:
    settings: Settings = _state["settings"]

    # Explicit confirmation path: the ONLY way a dispatch is actually executed. This
    # never runs from an LLM tool call — only from a caller that already received a
    # `proposedAction` and is now re-submitting it with explicit confirmation.
    if request.confirmedAction is not None:
        action = request.confirmedAction
        try:
            result = _state["backend"].create_dispatch(
                action.incidentId, action.unitId, action.priority, action.reason
            )
        except BackendUnavailableError as exc:
            return AgentResponseModel(
                available=False, reason=f"Dispatch confirmation failed: {exc}"
            )
        return AgentResponseModel(
            available=True,
            answer=f"Dispatch confirmed: unit {action.unitId} to incident {action.incidentId}.",
            confidence="high",
            toolsUsed=["Dispatch (confirmed)"],
            sources=[
                SourceEntryModel(
                    tool="Dispatch (confirmed)", dataOrigin="USER_GENERATED", summary=str(result)
                )
            ],
        )

    if not request.query:
        return AgentResponseModel(available=False, reason="No query or confirmedAction provided.")

    result = run_agent(request.query, _state["llm"], _state["tools"], settings.llm_max_tool_iterations)
    return _to_model(result)
