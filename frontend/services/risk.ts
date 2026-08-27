import { LOCATIONS, getLocation } from "@/data/locations";
import { RISK_ZONES } from "@/data/geo";
import type { LocationProfile, Severity, WhatIfInput, WhatIfResult } from "@/types";
import { ENDPOINTS } from "./endpoints";
import { request } from "./http";

/** GET /api/v1/risk/zones */
export function getRiskZones(): Promise<LocationProfile[]> {
  return request(ENDPOINTS.riskZones(), LOCATIONS);
}

/** GET /api/v1/risk/{id} */
export function getRiskById(id: string): Promise<LocationProfile> {
  return request(ENDPOINTS.riskById(id), getLocation(id));
}

/** GET /api/v1/gis/layers/risk-zones (raw GeoJSON) */
export function getRiskZoneGeo() {
  return request(ENDPOINTS.gisLayer("risk-zones"), RISK_ZONES);
}

function bandFor(value: number): Severity {
  if (value >= 85) return "critical";
  if (value >= 70) return "high";
  if (value >= 50) return "moderate";
  return "low";
}

/**
 * POST /api/v1/risk/predict — deterministic what-if projection.
 * (Mirrors what the AI service will return; computed locally for now.)
 */
export function predictRisk(
  id: string,
  input: WhatIfInput,
): Promise<WhatIfResult> {
  const loc = getLocation(id);
  const base = loc.risk.value;
  const projected = Math.max(
    0,
    Math.min(
      99,
      Math.round(
        base *
          (1 + 0.0042 * input.rainfallDelta + 0.0028 * input.soilMoistureDelta),
      ),
    ),
  );
  const scale = projected / Math.max(base, 1);
  const result: WhatIfResult = {
    currentRisk: base,
    projectedRisk: projected,
    band: bandFor(projected),
    impact: {
      villages: Math.round(loc.impact.villages * scale),
      roads: Math.round(loc.impact.roads * scale),
      bridges: Math.max(loc.impact.bridges, Math.round(loc.impact.bridges * scale)),
    },
  };
  return request(ENDPOINTS.riskPredict(), result, { delay: 120, method: "POST" });
}
