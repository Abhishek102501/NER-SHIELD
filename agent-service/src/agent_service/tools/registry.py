"""Explicit, typed tool definitions. No arbitrary code execution: every tool is a fixed
Python function with a validated JSON input schema, wired to exactly one backend endpoint
(or, for `search_knowledge_base`, the RAG store) — never a generic "run this code/SQL"
escape hatch.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from ..rag.embeddings import EmbeddingProvider
from ..rag.retrieval import retrieve
from ..rag.store import RagStore
from .backend_client import BackendClient, BackendUnavailableError


@dataclass
class ToolSpec:
    name: str
    description: str
    input_schema: dict
    is_write: bool
    handler: Callable[[dict], dict]


class ToolExecutionError(RuntimeError):
    pass


def build_tools(
    backend: BackendClient, embedding_provider: EmbeddingProvider, rag_store: RagStore | None
) -> list[ToolSpec]:
    def handle(fn: Callable[[], object]) -> dict:
        try:
            result = fn()
        except BackendUnavailableError as exc:
            raise ToolExecutionError(str(exc)) from exc
        return {"result": result}

    def get_weather(args: dict) -> dict:
        return handle(lambda: backend.get_weather(args["latitude"], args["longitude"]))

    def get_rainfall_forecast(_args: dict) -> dict:
        return handle(backend.get_rainfall_forecast)

    def get_gis_layer(args: dict) -> dict:
        return handle(lambda: backend.get_gis_layer(args["layer_id"]))

    def get_incidents(args: dict) -> dict:
        def run():
            incidents = backend.get_incidents()
            severity = args.get("severity")
            if severity:
                incidents = [i for i in incidents if i.get("severity") == severity]
            return incidents

        return handle(run)

    def get_threats(args: dict) -> dict:
        def run():
            threats = backend.get_threats()
            risk = args.get("risk")
            if risk:
                threats = [t for t in threats if t.get("risk") == risk]
            return threats

        return handle(run)

    def get_risk_zones(args: dict) -> dict:
        def run():
            zones = backend.get_risk_zones()
            band = args.get("band")
            if band:
                zones = [z for z in zones if z.get("risk", {}).get("band") == band]
            return zones

        return handle(run)

    def get_alerts(args: dict) -> dict:
        def run():
            alerts = backend.get_alerts()
            if args.get("unacknowledgedOnly"):
                alerts = [a for a in alerts if not a.get("acknowledged")]
            return alerts

        return handle(run)

    def get_response_units(args: dict) -> dict:
        def run():
            units = backend.get_response_units()
            kind = args.get("kind")
            if kind:
                units = [u for u in units if u.get("kind") == kind]
            return units

        return handle(run)

    def search_knowledge_base(args: dict) -> dict:
        result = retrieve(args["query"], embedding_provider, rag_store, top_k=args.get("topK", 5))
        if not result.available:
            return {"available": False, "reason": result.reason, "matches": []}
        return {
            "available": True,
            "matches": [
                {
                    "title": m.title,
                    "issuingOrganization": m.issuing_organization,
                    "sourceUrl": m.source_url,
                    "documentType": m.document_type,
                    "documentDate": m.document_date,
                    "verificationStatus": m.verification_status,
                    "chunkText": m.chunk_text,
                    "similarity": m.similarity,
                }
                for m in result.matches
            ],
        }

    def create_dispatch(args: dict) -> dict:
        # Defined for schema completeness / so the model can express intent, but the
        # agent loop (agent/loop.py) intercepts any call to this tool BEFORE reaching
        # this handler and returns a proposedAction instead — this handler only ever
        # runs from the explicit user-confirmation path in main.py, never automatically.
        return handle(
            lambda: backend.create_dispatch(
                args["incidentId"], args["unitId"], args.get("priority", "High"), args.get("reason", "")
            )
        )

    return [
        ToolSpec(
            name="get_weather",
            description="Get real current-conditions weather (temperature, humidity, wind, precipitation) for a coordinate, via Open-Meteo.",
            input_schema={
                "type": "object",
                "properties": {
                    "latitude": {"type": "number"},
                    "longitude": {"type": "number"},
                },
                "required": ["latitude", "longitude"],
            },
            is_write=False,
            handler=get_weather,
        ),
        ToolSpec(
            name="get_rainfall_forecast",
            description="Get the real LSTM+XGBoost 12-hour rainfall forecast for the North East India region (Guwahati station).",
            input_schema={"type": "object", "properties": {}},
            is_write=False,
            handler=get_rainfall_forecast,
        ),
        ToolSpec(
            name="get_gis_layer",
            description="Get a named GeoJSON layer from the GIS command map (e.g. risk-zone-polygons, roads, rivers, villages, schools, infrastructure, incident-points).",
            input_schema={
                "type": "object",
                "properties": {"layer_id": {"type": "string"}},
                "required": ["layer_id"],
            },
            is_write=False,
            handler=get_gis_layer,
        ),
        ToolSpec(
            name="get_incidents",
            description="Get currently known incidents, optionally filtered by severity (low/moderate/high/critical).",
            input_schema={
                "type": "object",
                "properties": {"severity": {"type": "string", "enum": ["low", "moderate", "high", "critical"]}},
            },
            is_write=False,
            handler=get_incidents,
        ),
        ToolSpec(
            name="get_threats",
            description="Get recent threat detection events, optionally filtered by risk tier (low/medium/high).",
            input_schema={
                "type": "object",
                "properties": {"risk": {"type": "string", "enum": ["low", "medium", "high"]}},
            },
            is_write=False,
            handler=get_threats,
        ),
        ToolSpec(
            name="get_risk_zones",
            description="Get landslide/flood risk zone assessments, optionally filtered by risk band (low/moderate/high/critical).",
            input_schema={
                "type": "object",
                "properties": {"band": {"type": "string", "enum": ["low", "moderate", "high", "critical"]}},
            },
            is_write=False,
            handler=get_risk_zones,
        ),
        ToolSpec(
            name="get_alerts",
            description="Get escalation alerts, optionally filtered to only unacknowledged ones.",
            input_schema={
                "type": "object",
                "properties": {"unacknowledgedOnly": {"type": "boolean"}},
            },
            is_write=False,
            handler=get_alerts,
        ),
        ToolSpec(
            name="get_response_units",
            description="Get the response unit roster (NDRF/SDRF/Police/Medical/Engineering), optionally filtered by kind.",
            input_schema={
                "type": "object",
                "properties": {
                    "kind": {
                        "type": "string",
                        "enum": ["NDRF", "SDRF", "Police", "Medical", "Engineering"],
                    }
                },
            },
            is_write=False,
            handler=get_response_units,
        ),
        ToolSpec(
            name="search_knowledge_base",
            description="Search verified disaster-management guidance documents (NDMA/NDRF/IMD-type official material) for preparedness/procedure information. Returns available=false if no knowledge base is configured — never fabricated documents.",
            input_schema={
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "topK": {"type": "integer"},
                },
                "required": ["query"],
            },
            is_write=False,
            handler=search_knowledge_base,
        ),
        ToolSpec(
            name="create_dispatch",
            description=(
                "Dispatch a response unit to an incident. WRITE ACTION — calling this tool"
                " never executes immediately; it always requires explicit user confirmation"
                " first. Use it to PROPOSE a dispatch, not to perform one."
            ),
            input_schema={
                "type": "object",
                "properties": {
                    "incidentId": {"type": "string"},
                    "unitId": {"type": "string"},
                    "reason": {"type": "string"},
                },
                "required": ["incidentId", "unitId", "reason"],
            },
            is_write=True,
            handler=create_dispatch,
        ),
    ]


def to_anthropic_schema(tools: list[ToolSpec]) -> list[dict]:
    return [{"name": t.name, "description": t.description, "input_schema": t.input_schema} for t in tools]
