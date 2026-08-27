import type { AppNotification } from "@/types";

/**
 * Region framing for the map placeholder. Coordinates below are indicative
 * framing labels only — NOT a real GIS dataset.
 */
export const REGION = {
  name: "North Eastern Region",
  short: "NER",
  sector: "Sikkim · Darjeeling Himalaya",
  bbox: {
    north: "27.8°N",
    south: "26.9°N",
    west: "88.0°E",
    east: "88.9°E",
  },
  centroid: "27.35°N, 88.45°E",
} as const;

/**
 * Abstract location nodes for the placeholder map (0–100 space).
 * These are stylised markers, not surveyed positions.
 */
export const MAP_NODES: {
  id: string;
  x: number;
  y: number;
  severity: "low" | "moderate" | "high" | "critical";
  kind: "zone" | "sensor" | "asset";
}[] = [
  { id: "n1", x: 34, y: 38, severity: "critical", kind: "zone" },
  { id: "n2", x: 58, y: 30, severity: "high", kind: "zone" },
  { id: "n3", x: 46, y: 58, severity: "moderate", kind: "zone" },
  { id: "n4", x: 26, y: 66, severity: "high", kind: "zone" },
  { id: "n5", x: 70, y: 52, severity: "low", kind: "sensor" },
  { id: "n6", x: 62, y: 72, severity: "moderate", kind: "sensor" },
  { id: "n7", x: 40, y: 24, severity: "low", kind: "asset" },
  { id: "n8", x: 52, y: 46, severity: "low", kind: "asset" },
];

export const NOTIFICATIONS: AppNotification[] = [
  {
    id: "ntf-1",
    severity: "critical",
    title: "Critical zone escalation",
    detail: "NH-10 / Sikkim corridor crossed the critical risk threshold.",
    timeAgo: "4 min ago",
  },
  {
    id: "ntf-2",
    severity: "high",
    title: "Rainfall intensity rising",
    detail: "72h accumulation reached 287 mm across the East District.",
    timeAgo: "19 min ago",
  },
  {
    id: "ntf-3",
    severity: "moderate",
    title: "New field report",
    detail: "Citizen report filed for debris on Hill Road 04.",
    timeAgo: "41 min ago",
  },
  {
    id: "ntf-4",
    severity: "low",
    title: "Sensor maintenance",
    detail: "Inclinometer WR-04 flagged for calibration.",
    timeAgo: "1 hr ago",
  },
];
