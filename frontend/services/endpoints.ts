/**
 * NER-SHIELD API surface (per SRS). These are the ONLY paths the frontend
 * knows about; the mock service layer resolves them locally for now.
 */
export const API_BASE = "/api/v1";

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
