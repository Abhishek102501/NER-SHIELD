import type { SystemMetric } from "@/types";

/**
 * DEMONSTRATION values only — not live data.
 * Operations panel "SYSTEM STATUS" metrics.
 */
export const SYSTEM_METRICS: SystemMetric[] = [
  {
    id: "active-alerts",
    label: "Active Alerts",
    value: 14,
    severity: "high",
    delta: "+3 / 1h",
    trend: "rising",
  },
  {
    id: "critical-zones",
    label: "Critical Zones",
    value: 3,
    severity: "critical",
    delta: "+1 / 6h",
    trend: "rising",
  },
  {
    id: "active-incidents",
    label: "Active Incidents",
    value: 7,
    severity: "moderate",
    delta: "+2 / 3h",
    trend: "rising",
  },
  {
    id: "field-reports",
    label: "Field Reports",
    value: 32,
    severity: "low",
    delta: "+11 / 24h",
    trend: "rising",
  },
];

export const SYSTEM_STATUS = {
  online: true,
  label: "System Online",
  region: "North East India",
  uplink: "Nominal",
  dataFreshness: "live · 8s",
  modelConfidence: 91,
} as const;
