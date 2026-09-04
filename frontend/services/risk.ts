import { LOCATIONS, getLocation } from "@/data/locations";
import { RISK_ZONES } from "@/data/geo";
import type { LocationProfile, Severity, WhatIfInput, WhatIfResult } from "@/types";
import { ENDPOINTS, RISK_ZONES_URL, riskZoneByIdUrl } from "./endpoints";
import { request } from "./http";

const VALID_SEVERITIES: readonly string[] = ["low", "moderate", "high", "critical"];

function isSeverity(value: unknown): value is Severity {
  return typeof value === "string" && VALID_SEVERITIES.includes(value);
}

/**
 * Structural check that a value is shaped like a {@link LocationProfile}. Deliberately
 * checks only the fields the frontend actually reads (see `types/index.ts`), not every
 * possible malformation — a backend response that passes this is safe to render as-is.
 */
function isLocationProfile(value: unknown): value is LocationProfile {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const risk = v.risk as Record<string, unknown> | undefined;
  const metrics = v.metrics as Record<string, unknown> | undefined;
  const impact = v.impact as Record<string, unknown> | undefined;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.sector === "string" &&
    Array.isArray(v.center) &&
    v.center.length === 2 &&
    typeof risk === "object" &&
    risk !== null &&
    typeof risk.value === "number" &&
    isSeverity(risk.band) &&
    Array.isArray(v.factors) &&
    typeof metrics === "object" &&
    metrics !== null &&
    Array.isArray(v.drivers) &&
    typeof impact === "object" &&
    impact !== null &&
    typeof v.activeIncidents === "number"
  );
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) {
      throw new Error(`GET ${url} -> ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * GET /api/risk/zones — real backend (`backend/.../risk/RiskZoneController`). Falls back to
 * the local `LOCATIONS` fixture, unchanged, if the backend is unreachable, times out, or
 * returns something that doesn't validate — mirroring `services/threats.ts`'s `getThreats()`.
 */
export async function getRiskZones(): Promise<LocationProfile[]> {
  try {
    const json = (await fetchJson(RISK_ZONES_URL)) as { zones?: unknown };
    if (!Array.isArray(json.zones) || !json.zones.every(isLocationProfile)) {
      throw new Error("Malformed /api/risk/zones response");
    }
    return json.zones;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[risk] backend unavailable, using demonstration data:", err);
    }
    return LOCATIONS;
  }
}

/**
 * GET /api/risk/zones/{id} — real backend. Falls back to the local fixture (via
 * `getLocation`) on any failure, same rationale as {@link getRiskZones}.
 */
export async function getRiskById(id: string): Promise<LocationProfile> {
  try {
    const json = await fetchJson(riskZoneByIdUrl(id));
    if (!isLocationProfile(json)) {
      throw new Error("Malformed /api/risk/zones/{id} response");
    }
    return json;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[risk] backend unavailable, using demonstration data:", err);
    }
    return getLocation(id);
  }
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
