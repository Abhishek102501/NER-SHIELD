import { DEMO_THREAT_EVENTS, type ThreatEvent, type ThreatRisk } from "@/data/threats";
import { THREATS_URL } from "./endpoints";

export type ThreatDataSource = "live" | "demo";

export interface ThreatsResult {
  events: ThreatEvent[];
  source: ThreatDataSource;
}

const VALID_RISKS: readonly string[] = ["high", "medium", "low"];

function isThreatRisk(value: unknown): value is ThreatRisk {
  return typeof value === "string" && VALID_RISKS.includes(value);
}

interface RawThreatEvent {
  id?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  locationAvailable?: unknown;
  location?: unknown;
  entity?: unknown;
  threatName?: unknown;
  risk?: unknown;
  timestamp?: unknown;
  description?: unknown;
}

interface RawThreatsResponse {
  meta?: { source?: unknown };
  events?: unknown;
}

/**
 * Normalizes one backend record into the frontend's `ThreatEvent` shape. Defensive by
 * design: an incomplete or unexpected record degrades to safe defaults — critically, it
 * is only ever treated as mappable when it carries real, numeric coordinates AND the
 * backend explicitly marked it `locationAvailable`. It never fabricates a location.
 */
function normalizeEvent(raw: RawThreatEvent, index: number): ThreatEvent {
  const hasCoords = typeof raw.latitude === "number" && typeof raw.longitude === "number";
  const locationAvailable = raw.locationAvailable === true && hasCoords;

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : `threat-${index}`,
    latitude: locationAvailable ? (raw.latitude as number) : undefined,
    longitude: locationAvailable ? (raw.longitude as number) : undefined,
    locationAvailable,
    location: typeof raw.location === "string" ? raw.location : "Location unavailable",
    entity: typeof raw.entity === "string" ? raw.entity : "Unknown",
    threatName: typeof raw.threatName === "string" ? raw.threatName : "Unclassified Event",
    risk: isThreatRisk(raw.risk) ? raw.risk : "low",
    timestamp: typeof raw.timestamp === "string" ? raw.timestamp : new Date().toISOString(),
    description: typeof raw.description === "string" ? raw.description : "",
  };
}

function isThreatsResponse(value: unknown): value is RawThreatsResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as RawThreatsResponse).events)
  );
}

/**
 * GET /api/threats — the Global Threat Intelligence feed.
 *
 * Tries the real backend (`backend/.../threat/ThreatController`) first. If it's
 * unreachable, times out, or returns something that doesn't validate as a threats
 * response, this falls back to `DEMO_THREAT_EVENTS` and reports `source: "demo"` — callers
 * (`GlobalThreatIntelSection`) use that to avoid ever showing a "LIVE" indicator over
 * demonstration data.
 */
export async function getThreats(): Promise<ThreatsResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let res: Response;
    try {
      res = await fetch(THREATS_URL, { signal: controller.signal, cache: "no-store" });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      throw new Error(`GET ${THREATS_URL} -> ${res.status}`);
    }

    const json: unknown = await res.json();
    if (!isThreatsResponse(json)) {
      throw new Error("Malformed /api/threats response");
    }

    const events = (json.events as unknown[]).map((e, i) =>
      normalizeEvent(e as RawThreatEvent, i),
    );
    const source: ThreatDataSource = json.meta?.source === "live" ? "live" : "demo";
    return { events, source };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[threats] backend unavailable, using demonstration data:", err);
    }
    return { events: DEMO_THREAT_EVENTS, source: "demo" };
  }
}
