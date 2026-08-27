/**
 * NER-SHIELD shared domain types.
 * All values sourced from these types are DEMONSTRATION data (see /data).
 */

export type Severity = "low" | "moderate" | "high" | "critical";

export type Trend = "rising" | "falling" | "stable";

export interface SystemMetric {
  id: string;
  label: string;
  value: number;
  /** Optional severity tint for the metric accent. */
  severity?: Severity;
  /** Short delta descriptor, e.g. "+3 / 1h". */
  delta?: string;
  trend?: Trend;
}

export interface Incident {
  id: string;
  severity: Severity;
  title: string;
  location: string;
  /** Human-readable relative time, e.g. "12 min ago". */
  timeAgo: string;
  /** Abstract map position in 0–100 space (placeholder, not real geodata). */
  x: number;
  y: number;
  summary: string;
  category: string;
  reportedBy: string;
}

export interface RiskFactor {
  id: string;
  label: string;
  /** Weight/contribution as a percentage (0–100). */
  weight: number;
  severity: Severity;
}

export interface RiskScore {
  value: number;
  confidence: number;
  band: Severity;
  bandLabel: string;
  deltaLabel: string;
  deltaDirection: "up" | "down";
}

export interface ImpactItem {
  id: string;
  label: string;
  count: number;
  icon: "village" | "road" | "bridge" | "hospital";
}

export interface RainfallPoint {
  hour: string;
  mm: number;
}

export interface TimelinePoint {
  id: string;
  label: string;
  /** Risk index 0–100. */
  risk: number;
  /** true for the current moment. */
  now?: boolean;
  /** true for forecast (future) points. */
  forecast?: boolean;
}

export type LayerGroupId = "base" | "intelligence" | "infrastructure";

export interface MapLayer {
  id: string;
  label: string;
  group: LayerGroupId;
  defaultOn: boolean;
}

export interface AppNotification {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  timeAgo: string;
}

/* ============================================================
   Milestone 2 — narrative / prediction / GIS / response
   ============================================================ */

/** A monitored location profile (drives the interactive risk experience). */
export interface LocationProfile {
  id: string;
  name: string;
  sector: string;
  /** [lng, lat] — used to fly the GIS map. */
  center: [number, number];
  risk: {
    value: number;
    band: Severity;
    confidence: number;
    deltaLabel: string;
    deltaDirection: "up" | "down";
  };
  factors: RiskFactor[];
  metrics: {
    rainfall24h: number; // mm
    rainfall72h: number; // mm
    soilMoisture: number; // %
    slope: number; // degrees
    elevation: number; // m
  };
  /** Explainable-AI primary drivers. */
  drivers: RiskDriver[];
  impact: {
    villages: number;
    roads: number;
    bridges: number;
    hospitals: number;
    populationExposure: number;
  };
  activeIncidents: number;
}

export interface RiskDriver {
  id: string;
  label: string;
  detail: string;
  /** Contribution to the score, 0–100. */
  contribution: number;
  severity: Severity;
}

/** A what-if adjustment + its projected outcome. */
export interface WhatIfInput {
  rainfallDelta: number; // %
  soilMoistureDelta: number; // %
}

export interface WhatIfResult {
  currentRisk: number;
  projectedRisk: number;
  band: Severity;
  impact: {
    villages: number;
    roads: number;
    bridges: number;
  };
}

/** GIS risk zone (mirrors a GeoJSON feature's properties). */
export interface RiskZone {
  id: string;
  name: string;
  band: Severity;
  risk: number;
  rainfall: number;
  population: number;
  roadsAtRisk: number;
  recommendedAction: string;
}

export type ResponsePhase = "detect" | "assess" | "prioritize" | "respond";

export interface ResponseIncident {
  id: string;
  title: string;
  location: string;
  severity: Severity;
  riskScore: number;
  populationExposure: number;
  infrastructureExposure: string;
  recommendedAction: string;
  phase: ResponsePhase;
  priority: number;
}

export type SyncStatus = "offline" | "queued" | "syncing" | "synced";

export interface FieldReportDraft {
  id: string;
  gps: string;
  incidentType: string;
  severity: Severity;
  evidenceCount: number;
  status: SyncStatus;
  timeAgo: string;
}

export interface EscalationAlert {
  id: string;
  zone: string;
  from: Severity;
  to: Severity;
  cause: string;
  action: string;
  timeAgo: string;
}
