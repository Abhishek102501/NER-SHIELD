import type { ImpactItem, RiskFactor, RiskScore } from "@/types";

/** DEMONSTRATION AI risk output — not a live model inference. */
export const RISK_SCORE: RiskScore = {
  value: 87.4,
  confidence: 91,
  band: "critical",
  bandLabel: "Critical",
  deltaLabel: "+12.6% / 6H",
  deltaDirection: "up",
};

export const RISK_FACTORS: RiskFactor[] = [
  { id: "rainfall", label: "Rainfall", weight: 34, severity: "critical" },
  { id: "soil-moisture", label: "Soil Moisture", weight: 24, severity: "high" },
  { id: "slope", label: "Slope", weight: 18, severity: "high" },
  { id: "historical", label: "Historical Risk", weight: 13, severity: "moderate" },
  { id: "satellite", label: "Satellite Change", weight: 7, severity: "moderate" },
  { id: "terrain", label: "Terrain", weight: 4, severity: "low" },
];

export const IMPACT_ITEMS: ImpactItem[] = [
  { id: "villages", label: "Villages", count: 4, icon: "village" },
  { id: "roads", label: "Roads", count: 7, icon: "road" },
  { id: "bridges", label: "Bridges", count: 2, icon: "bridge" },
  { id: "hospitals", label: "Hospital", count: 1, icon: "hospital" },
];
