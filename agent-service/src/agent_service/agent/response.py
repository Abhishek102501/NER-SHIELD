from __future__ import annotations

from dataclasses import dataclass, field

# Static, honest classification of what each tool actually returns. Shown to the caller as
# part of `sources` so a demo-seeded incident is never confused with a real-world report.
TOOL_DATA_ORIGIN: dict[str, str] = {
    "get_weather": "REAL_EXTERNAL",
    "get_rainfall_forecast": "REAL_EXTERNAL",
    "get_gis_layer": "DATABASE_BACKED",
    "get_incidents": "DATABASE_BACKED (seed content is DEMO_SEED — see dataOrigin per record)",
    "get_threats": "DATABASE_BACKED (seed content is DEMO_SEED — see dataOrigin per record)",
    "get_risk_zones": "DATABASE_BACKED (seed content is DEMO_SEED — see dataOrigin per record)",
    "get_alerts": "DATABASE_BACKED (seed content is DEMO_SEED — see dataOrigin per record)",
    "get_response_units": "DATABASE_BACKED (seed content is DEMO_SEED)",
    "search_knowledge_base": "DERIVED (retrieved document excerpt; verify sourceUrl)",
    "create_dispatch": "USER_GENERATED",
}

TOOL_DISPLAY_NAMES: dict[str, str] = {
    "get_weather": "Weather",
    "get_rainfall_forecast": "Rainfall forecast",
    "get_gis_layer": "GIS layer",
    "get_incidents": "Incidents",
    "get_threats": "Threats",
    "get_risk_zones": "Risk zones",
    "get_alerts": "Alerts",
    "get_response_units": "Response units",
    "search_knowledge_base": "Knowledge base",
    "create_dispatch": "Dispatch (proposed)",
}


@dataclass
class SourceEntry:
    tool: str
    dataOrigin: str
    summary: str


@dataclass
class ProposedAction:
    type: str
    incidentId: str
    unitId: str
    reason: str


@dataclass
class AgentResult:
    available: bool
    answer: str | None
    confidence: str | None  # "high" | "medium" | "low" | None
    toolsUsed: list[str] = field(default_factory=list)
    sources: list[SourceEntry] = field(default_factory=list)
    retrievedDocuments: list[dict] = field(default_factory=list)
    recommendations: list[str] = field(default_factory=list)
    requiresConfirmation: bool = False
    proposedAction: ProposedAction | None = None
    reason: str | None = None  # set when available=False
