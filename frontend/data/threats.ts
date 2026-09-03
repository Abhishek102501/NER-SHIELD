/**
 * NER-SHIELD Global Threat Intelligence — types and DEMONSTRATION fallback data.
 *
 * The real data path is `services/threats.ts` (`getThreats()`), which calls the backend's
 * `GET /api/threats` (see `backend/src/main/java/com/nershield/threat/`) and falls back to
 * `DEMO_THREAT_EVENTS` below only when that backend is unreachable. This module owns just
 * the shared shape and the fallback payload — mirroring how `data/incidents.ts` etc. hold
 * mock data for the `services/*.ts` wrappers that resolve it.
 */

export type ThreatRisk = "high" | "medium" | "low";

export interface ThreatEvent {
  id: string;
  /** Only meaningful when {@link locationAvailable} is true — never a guessed coordinate. */
  latitude?: number;
  longitude?: number;
  /** False when the source detection had no real geographic location; the map must skip it. */
  locationAvailable: boolean;
  location: string;
  entity: string;
  threatName: string;
  risk: ThreatRisk;
  timestamp: string;
  description: string;
}

/** Demonstration data, used only when `GET /api/threats` is unavailable. */
export const DEMO_THREAT_EVENTS: ThreatEvent[] = [
  {
    id: "thr-001",
    latitude: 28.6139,
    longitude: 77.209,
    locationAvailable: true,
    location: "New Delhi, India",
    entity: "Organization",
    threatName: "Suspicious Entity Activity",
    risk: "high",
    timestamp: "2026-09-03T10:30:00Z",
    description: "Potential sensitive entity exposure detected in outbound traffic logs.",
  },
  {
    id: "thr-002",
    latitude: 25.5788,
    longitude: 91.8933,
    locationAvailable: true,
    location: "Shillong, Meghalaya",
    entity: "Person",
    threatName: "Unauthorized Access Attempt",
    risk: "high",
    timestamp: "2026-09-03T08:12:00Z",
    description: "Repeated failed authentication against a field-office credential set.",
  },
  {
    id: "thr-003",
    latitude: 26.1445,
    longitude: 91.7362,
    locationAvailable: true,
    location: "Guwahati, Assam",
    entity: "IP Address",
    threatName: "Anomalous Network Scan",
    risk: "medium",
    timestamp: "2026-09-03T06:47:00Z",
    description: "Port-scanning behaviour observed against a regional relay node.",
  },
  {
    id: "thr-004",
    latitude: 23.7271,
    longitude: 92.7176,
    locationAvailable: true,
    location: "Aizawl, Mizoram",
    entity: "Document",
    threatName: "PII Exposure Flag",
    risk: "medium",
    timestamp: "2026-09-02T22:18:00Z",
    description: "Draft field report contained unmasked identifiers before redaction.",
  },
  {
    id: "thr-005",
    latitude: 27.4728,
    longitude: 94.912,
    locationAvailable: true,
    location: "Itanagar, Arunachal Pradesh",
    entity: "Organization",
    threatName: "Vendor Access Review",
    risk: "low",
    timestamp: "2026-09-02T19:05:00Z",
    description: "Routine third-party access pattern, flagged for scheduled review only.",
  },
  {
    id: "thr-006",
    locationAvailable: false,
    location: "Location unavailable",
    entity: "Device",
    threatName: "Sensor Heartbeat Delay",
    risk: "low",
    timestamp: "2026-09-02T15:41:00Z",
    description: "Field sensor reported an extended heartbeat gap; no location beacon attached.",
  },
  {
    id: "thr-007",
    latitude: 23.8315,
    longitude: 91.2868,
    locationAvailable: true,
    location: "Agartala, Tripura",
    entity: "Person",
    threatName: "Credential Stuffing Attempt",
    risk: "high",
    timestamp: "2026-09-01T13:52:00Z",
    description: "Automated login attempts detected across multiple operator accounts.",
  },
  {
    id: "thr-008",
    latitude: 27.0844,
    longitude: 93.6053,
    locationAvailable: true,
    location: "Kohima, Nagaland",
    entity: "IP Address",
    threatName: "Data Exfiltration Signal",
    risk: "medium",
    timestamp: "2026-09-01T09:27:00Z",
    description: "Elevated outbound data volume from a regional command node.",
  },
];

export interface ThreatSummary {
  total: number;
  high: number;
  medium: number;
  low: number;
}

export function summarizeThreats(threats: ThreatEvent[]): ThreatSummary {
  return threats.reduce(
    (acc, t) => {
      acc.total += 1;
      acc[t.risk] += 1;
      return acc;
    },
    { total: 0, high: 0, medium: 0, low: 0 } as ThreatSummary,
  );
}
