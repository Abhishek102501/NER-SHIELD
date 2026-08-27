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
} from "@/types";
import { ENDPOINTS } from "./endpoints";
import { request } from "./http";

/** GET /api/v1/incidents */
export function getIncidents(): Promise<Incident[]> {
  return request(ENDPOINTS.incidents(), INCIDENTS);
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
