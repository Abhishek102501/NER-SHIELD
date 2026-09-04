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
