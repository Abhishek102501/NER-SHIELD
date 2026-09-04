import { ESCALATION_ALERTS } from "@/data/alerts";
import { FIELD_REPORTS } from "@/data/field";
import { INCIDENTS } from "@/data/incidents";
import { RESPONSE_INCIDENTS } from "@/data/response";
import type {
  AppNotification,
  EscalationAlert,
  FieldReportDraft,
  Incident,
  ResponseIncident,
  Severity,
} from "@/types";
import { ENDPOINTS, INCIDENTS_URL } from "./endpoints";
import { request } from "./http";

const VALID_SEVERITIES: readonly string[] = ["low", "moderate", "high", "critical"];

function isSeverity(value: unknown): value is Severity {
  return typeof value === "string" && VALID_SEVERITIES.includes(value);
}

/** Structural check that a value is shaped like an {@link Incident} (see `types/index.ts`). */
function isIncident(value: unknown): value is Incident {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    isSeverity(v.severity) &&
    typeof v.title === "string" &&
    typeof v.location === "string" &&
    typeof v.timeAgo === "string" &&
    typeof v.x === "number" &&
    typeof v.y === "number" &&
    typeof v.summary === "string" &&
    typeof v.category === "string" &&
    typeof v.reportedBy === "string"
  );
}

/**
 * GET /api/incidents — real backend (`backend/.../incident/IncidentController`). Falls back
 * to the local `INCIDENTS` fixture, unchanged, if the backend is unreachable, times out, or
 * returns something that doesn't validate — mirroring `services/threats.ts`'s `getThreats()`.
 */
export async function getIncidents(): Promise<Incident[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let res: Response;
    try {
      res = await fetch(INCIDENTS_URL, { signal: controller.signal, cache: "no-store" });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      throw new Error(`GET ${INCIDENTS_URL} -> ${res.status}`);
    }

    const json = (await res.json()) as { incidents?: unknown };
    if (!Array.isArray(json.incidents) || !json.incidents.every(isIncident)) {
      throw new Error("Malformed /api/incidents response");
    }
    return json.incidents;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[incidents] backend unavailable, using demonstration data:", err);
    }
    return INCIDENTS;
  }
}

/** GET /api/v1/incidents (response-priority view) */
export function getResponseQueue(): Promise<ResponseIncident[]> {
  return request(ENDPOINTS.incidents(), RESPONSE_INCIDENTS);
}

/** GET /api/v1/field-reports */
export function getFieldReports(): Promise<FieldReportDraft[]> {
  return request(ENDPOINTS.fieldReports(), FIELD_REPORTS);
}

/** POST /api/v1/field-reports (mock echo) */
export function submitFieldReport(
  draft: Omit<FieldReportDraft, "id" | "status" | "timeAgo">,
): Promise<FieldReportDraft> {
  const created: FieldReportDraft = {
    ...draft,
    id: `FR-${1000 + Math.floor(Math.random() * 9000)}`,
    status: "queued",
    timeAgo: "just now",
  };
  return request(ENDPOINTS.fieldReports(), created, {
    delay: 300,
    method: "POST",
  });
}

/** GET /api/v1/alerts */
export function getAlerts(): Promise<EscalationAlert[]> {
  return request(ENDPOINTS.alerts(), ESCALATION_ALERTS);
}

/** PATCH /api/v1/alerts (acknowledge) */
export function acknowledgeAlert(id: string): Promise<{ id: string; ok: true }> {
  return request(ENDPOINTS.alerts(), { id, ok: true }, {
    delay: 120,
    method: "PATCH",
  });
}

export type { AppNotification };
