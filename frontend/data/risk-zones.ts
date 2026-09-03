import type { RiskZoneDetail } from "@/types";

/**
 * DEMO / MOCK DATA — full GIS risk-zone assessments, keyed by the zone ids used
 * in the GeoJSON layer (see data/geo.ts). Replaceable by `/api/v1/risk/{id}`.
 * Not a scientifically validated prediction.
 */
export const RISK_ZONE_DETAILS: Record<string, RiskZoneDetail> = {
  "nh10-sikkim": {
    id: "nh10-sikkim",
    name: "NH-10 Corridor",
    band: "critical",
    risk: 87,
    probability: 84,
    rainfall: 142,
    population: 12800,
    infrastructureAtRisk: "7 roads · 2 bridges · 1 hospital · 2 schools",
    drivers: [
      "Extreme rainfall accumulation (287 mm / 72h)",
      "High soil moisture (82%, past failure threshold)",
      "Steep cut-slope terrain (41°)",
      "Historical susceptibility (9 failures since 2011)",
    ],
    recommendedAction: "Immediate closure review & field verification",
    center: [88.53, 27.17],
  },
  "east-district": {
    id: "east-district",
    name: "East District Ridge",
    band: "high",
    risk: 74,
    probability: 71,
    rainfall: 128,
    population: 8300,
    infrastructureAtRisk: "4 roads · 1 bridge · 3 schools",
    drivers: [
      "Sustained rainfall over 36h",
      "Saturated hillslope regolith",
      "Moderate slope gradient (33°)",
    ],
    recommendedAction: "Heighten monitoring; stage response teams",
    center: [88.68, 27.24],
  },
  "teesta-basin": {
    id: "teesta-basin",
    name: "Teesta Basin",
    band: "high",
    risk: 71,
    probability: 68,
    rainfall: 118,
    population: 9600,
    infrastructureAtRisk: "4 roads · 3 bridges",
    drivers: [
      "Rising upstream river discharge",
      "Sustained catchment rainfall (236 mm / 72h)",
      "Valley-floor settlement exposure",
    ],
    recommendedAction: "Flood watch; advise low-lying settlements",
    center: [88.53, 27.02],
  },
  "hill-road-04": {
    id: "hill-road-04",
    name: "Hill Road 04 Sector",
    band: "moderate",
    risk: 52,
    probability: 47,
    rainfall: 86,
    population: 3400,
    infrastructureAtRisk: "2 roads · 1 school",
    drivers: [
      "Minor rockfall history",
      "Moderate rainfall accumulation",
    ],
    recommendedAction: "Routine patrol; clear minor debris",
    center: [88.42, 27.09],
  },
  "west-ridge": {
    id: "west-ridge",
    name: "West Ridge Array",
    band: "low",
    risk: 34,
    probability: 28,
    rainfall: 54,
    population: 1900,
    infrastructureAtRisk: "1 road · sensor array",
    drivers: [
      "Nominal environmental conditions",
      "Sensor calibration drift (de-weighted)",
    ],
    recommendedAction: "Nominal; continue sensor calibration",
    center: [88.36, 27.2],
  },
};

export function getZoneDetail(id: string): RiskZoneDetail | null {
  return RISK_ZONE_DETAILS[id] ?? null;
}
