/**
 * NER-SHIELD API surface (per SRS). These are the ONLY paths the frontend
 * knows about; the mock service layer resolves them locally for now.
 */
export const API_BASE = "/api/v1";

/**
 * Base URL of the real NER-SHIELD Spring Boot backend (see `backend/`). Unlike
 * `API_BASE` above — a speculative `/api/v1` namespace the mock layer resolves locally —
 * this points at an actually-running service, so it's a full origin, configurable via
 * `NEXT_PUBLIC_API_BASE_URL`, and mirrors the backend's own unversioned `/api/...` routes
 * (e.g. `/api/health`, `/api/threats`).
 */
export const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export const THREATS_URL = `${BACKEND_BASE_URL}/api/threats`;

/** GET /api/risk/zones — real backend, same origin/rationale as THREATS_URL above. */
export const RISK_ZONES_URL = `${BACKEND_BASE_URL}/api/risk/zones`;

/** GET /api/risk/zones/{id} — real backend. */
export const riskZoneByIdUrl = (id: string) =>
  `${BACKEND_BASE_URL}/api/risk/zones/${encodeURIComponent(id)}`;

/** GET /api/incidents — real backend, same origin/rationale as THREATS_URL above. */
export const INCIDENTS_URL = `${BACKEND_BASE_URL}/api/incidents`;

/** POST /api/landslide/analyze, GET /api/landslide/health — real backend, proxying the
 * Python AI service's Landslide4Sense module. Same origin/rationale as THREATS_URL above. */
export const LANDSLIDE_ANALYZE_URL = `${BACKEND_BASE_URL}/api/landslide/analyze`;
export const LANDSLIDE_HEALTH_URL = `${BACKEND_BASE_URL}/api/landslide/health`;
export const landslideAnalysisUrl = (analysisId: string) =>
  `${BACKEND_BASE_URL}/api/landslide/analysis/${encodeURIComponent(analysisId)}`;

/** POST /api/rainfall/forecast/demo, GET /api/rainfall/health — real backend, proxying the
 * Python AI service's Mumbai rainfall LSTM. Same origin/rationale as THREATS_URL above. */
export const RAINFALL_FORECAST_DEMO_URL = `${BACKEND_BASE_URL}/api/rainfall/forecast/demo`;
export const RAINFALL_HEALTH_URL = `${BACKEND_BASE_URL}/api/rainfall/health`;
export const RAINFALL_EXPLAIN_DEMO_URL = `${BACKEND_BASE_URL}/api/rainfall/explain/demo`;

/** GET/POST /api/field-reports — real backend. Same origin/rationale as THREATS_URL above. */
export const FIELD_REPORTS_BACKEND_URL = `${BACKEND_BASE_URL}/api/field-reports`;

/** GET /api/response/incidents, GET /api/response/units, POST /api/response/dispatch —
 * real backend. Same origin/rationale as THREATS_URL above. */
export const RESPONSE_INCIDENTS_URL = `${BACKEND_BASE_URL}/api/response/incidents`;
export const RESPONSE_UNITS_URL = `${BACKEND_BASE_URL}/api/response/units`;
export const RESPONSE_DISPATCH_URL = `${BACKEND_BASE_URL}/api/response/dispatch`;

/** GET /api/gis/layers/{id} — real backend. Same origin/rationale as THREATS_URL above. */
export const gisLayerBackendUrl = (id: string) =>
  `${BACKEND_BASE_URL}/api/gis/layers/${encodeURIComponent(id)}`;

/** GET /api/weather/current — real backend (Open-Meteo). Same origin/rationale as
 * THREATS_URL above. Unlike the other real domains, there is no local-fixture fallback:
 * an unreachable/unconfigured backend surfaces as `available: false`, never fake weather. */
export const weatherCurrentUrl = (latitude: number, longitude: number) =>
  `${BACKEND_BASE_URL}/api/weather/current?latitude=${latitude}&longitude=${longitude}`;

/** POST /api/agent/query — real backend, proxying agent-service (LLM + tools + RAG). Same
 * origin/rationale as THREATS_URL above. No local fallback: an unavailable agent surfaces
 * as `available: false`, never a fabricated answer. */
export const AGENT_QUERY_URL = `${BACKEND_BASE_URL}/api/agent/query`;

export const ENDPOINTS = {
  riskZones: () => `${API_BASE}/risk/zones`,
  riskById: (id: string) => `${API_BASE}/risk/${id}`,
  riskPredict: () => `${API_BASE}/risk/predict`,
  incidents: () => `${API_BASE}/incidents`,
  fieldReports: () => `${API_BASE}/field-reports`,
  alerts: () => `${API_BASE}/alerts`,
  simulations: () => `${API_BASE}/simulations`,
  gisLayer: (layer: string) => `${API_BASE}/gis/layers/${layer}`,
} as const;

export type GisLayerName =
  | "risk-zones"
  | "roads"
  | "rivers"
  | "villages"
  | "infrastructure"
  | "incidents"
  | "rainfall";
