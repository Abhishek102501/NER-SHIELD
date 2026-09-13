import type { Incident } from "@/types";

/**
 * DEMONSTRATION incidents. `x`/`y` are abstract 0-100 coords for decorative
 * mini-map treatments only — the real GIS map uses `lngLat`, which reuses the
 * exact coordinates already established for these incidents in data/geo.ts
 * (`INCIDENT_POINTS`) rather than inventing a second set of numbers.
 */
export const INCIDENTS: Incident[] = [
  {
    id: "inc-1042",
    severity: "critical",
    title: "Slope failure risk",
    location: "NH-10 / Sikkim",
    timeAgo: "12 min ago",
    x: 34,
    y: 38,
    lngLat: [88.53, 27.15],
    status: "new",
    category: "Landslide",
    reportedBy: "Sensor grid · SK-07",
    summary:
      "Rapid pore-pressure rise detected on the NH-10 cut-slope corridor. Debris movement probability elevated; corridor flagged for pre-emptive closure review.",
  },
  {
    id: "inc-1039",
    severity: "high",
    title: "Saturated hillslope",
    location: "East District",
    timeAgo: "27 min ago",
    x: 58,
    y: 30,
    lngLat: [88.66, 27.23],
    status: "new",
    category: "Landslide",
    reportedBy: "Field unit · ED-02",
    summary:
      "Continuous rainfall over 36h has pushed soil moisture past the seasonal threshold across the East District ridge line.",
  },
  {
    id: "inc-1036",
    severity: "moderate",
    title: "Minor debris on carriageway",
    location: "Hill Road 04",
    timeAgo: "41 min ago",
    x: 46,
    y: 58,
    lngLat: [88.45, 27.1],
    status: "new",
    category: "Road Obstruction",
    reportedBy: "Field report · citizen",
    summary:
      "Small rockfall partially obstructing a single lane. No casualties reported. Clearance crew notified.",
  },
  {
    id: "inc-1031",
    severity: "high",
    title: "River level surge",
    location: "Teesta Basin",
    timeAgo: "58 min ago",
    x: 26,
    y: 66,
    lngLat: [88.52, 27.0],
    status: "new",
    category: "Flood",
    reportedBy: "Gauge station · TB-11",
    summary:
      "Upstream discharge climbing faster than the 6-hour forecast band. Low-lying settlements advised to monitor.",
  },
  {
    id: "inc-1028",
    severity: "low",
    title: "Sensor calibration drift",
    location: "West Ridge Array",
    timeAgo: "1 hr 14 min ago",
    x: 70,
    y: 52,
    // West Ridge Array shares its position with the "West Ridge Array" risk
    // zone in data/geo.ts (RISK_ZONES `west-ridge`), not an invented point.
    lngLat: [88.36, 27.2],
    status: "acknowledged",
    acknowledgedBy: "Ops Command",
    acknowledgedAt: "2026-09-13T06:10:00.000Z",
    category: "System",
    reportedBy: "Diagnostics",
    summary:
      "Inclinometer WR-04 reporting drift beyond tolerance. Flagged for maintenance; readings de-weighted in the model.",
  },
];
