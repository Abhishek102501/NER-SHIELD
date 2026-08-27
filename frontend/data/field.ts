import type { FieldReportDraft } from "@/types";

/** DEMONSTRATION field-report queue (offline-first). Replaceable by `/api/v1/field-reports`. */
export const FIELD_REPORTS: FieldReportDraft[] = [
  {
    id: "FR-0031",
    gps: "27.176°N, 88.531°E",
    incidentType: "Landslide",
    severity: "critical",
    evidenceCount: 3,
    status: "queued",
    timeAgo: "2 min ago",
  },
  {
    id: "FR-0030",
    gps: "27.238°N, 88.664°E",
    incidentType: "Road Obstruction",
    severity: "moderate",
    evidenceCount: 1,
    status: "queued",
    timeAgo: "9 min ago",
  },
  {
    id: "FR-0029",
    gps: "27.021°N, 88.529°E",
    incidentType: "Flood",
    severity: "high",
    evidenceCount: 2,
    status: "synced",
    timeAgo: "24 min ago",
  },
];
