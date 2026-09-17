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
  SyncStatus,
} from "@/types";
import { ENDPOINTS, FIELD_REPORTS_BACKEND_URL, INCIDENTS_URL } from "./endpoints";
import { request } from "./http";

const VALID_SEVERITIES: readonly string[] = ["low", "moderate", "high", "critical"];
const VALID_SYNC_STATUSES: readonly string[] = ["offline", "queued", "syncing", "synced"];

function isSeverity(value: unknown): value is Severity {
  return typeof value === "string" && VALID_SEVERITIES.includes(value);
}

function isSyncStatus(value: unknown): value is SyncStatus {
  return typeof value === "string" && VALID_SYNC_STATUSES.includes(value);
}

/** Structural check that a value is shaped like a {@link FieldReportDraft}. */
function isFieldReportDraft(value: unknown): value is FieldReportDraft {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.gps === "string" &&
    typeof v.incidentType === "string" &&
    isSeverity(v.severity) &&
    typeof v.evidenceCount === "number" &&
    isSyncStatus(v.status) &&
    typeof v.timeAgo === "string"
  );
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
    // `status` (and the other workflow fields) are new — a real backend
    // response predating them still validates structurally above, so default
    // it here rather than let the UI read `undefined`.
    return json.incidents.map((i) => ({ ...i, status: i.status ?? "new" }));
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

/**
 * GET /api/field-reports — real backend (`backend/.../fieldreport/FieldReportController`).
 * Falls back to the local `FIELD_REPORTS` fixture, unchanged, if the backend is
 * unreachable, times out, or returns something that doesn't validate — mirroring
 * `getThreats()`/`getIncidents()` above.
 */
export async function getFieldReports(): Promise<FieldReportDraft[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let res: Response;
    try {
      res = await fetch(FIELD_REPORTS_BACKEND_URL, { signal: controller.signal, cache: "no-store" });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      throw new Error(`GET ${FIELD_REPORTS_BACKEND_URL} -> ${res.status}`);
    }

    const json: unknown = await res.json();
    if (!Array.isArray(json) || !json.every(isFieldReportDraft)) {
      throw new Error("Malformed /api/field-reports response");
    }
    return json;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[field-reports] backend unavailable, using demonstration data:", err);
    }
    return FIELD_REPORTS;
  }
}

/**
 * POST /api/field-reports — real backend. Falls back to a local mock echo (unchanged
 * behavior) if the backend is unreachable, times out, or returns something that doesn't
 * validate, so the field-report form still works offline/demo-only.
 */
export async function submitFieldReport(
  draft: Omit<FieldReportDraft, "id" | "status" | "timeAgo">,
): Promise<FieldReportDraft> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let res: Response;
    try {
      res = await fetch(FIELD_REPORTS_BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      throw new Error(`POST ${FIELD_REPORTS_BACKEND_URL} -> ${res.status}`);
    }

    const json: unknown = await res.json();
    if (!isFieldReportDraft(json)) {
      throw new Error("Malformed POST /api/field-reports response");
    }
    return json;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[field-reports] backend unavailable, using local mock submission:", err);
    }
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
