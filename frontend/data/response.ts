import type { ResponseIncident, ResponsePhase } from "@/types";

/** DEMONSTRATION response-priority queue. Replaceable by `/api/v1/incidents`. */
export const RESPONSE_INCIDENTS: ResponseIncident[] = [
  {
    id: "inc-1042",
    title: "Slope failure — imminent",
    location: "NH-10 / Sikkim",
    severity: "critical",
    riskScore: 87,
    populationExposure: 12800,
    infrastructureExposure: "7 roads · 2 bridges · 1 hospital",
    recommendedAction: "Close corridor & dispatch field verification team",
    phase: "respond",
    priority: 1,
  },
  {
    id: "inc-1039",
    title: "Saturated hillslope",
    location: "Meghalaya Sector 04",
    severity: "high",
    riskScore: 79,
    populationExposure: 18400,
    infrastructureExposure: "5 roads · 1 bridge · 1 hospital",
    recommendedAction: "Stage response teams; issue settlement advisory",
    phase: "prioritize",
    priority: 2,
  },
  {
    id: "inc-1031",
    title: "River level surge",
    location: "Teesta Basin",
    severity: "high",
    riskScore: 71,
    populationExposure: 9600,
    infrastructureExposure: "4 roads · 3 bridges",
    recommendedAction: "Flood watch; pre-position relief at depot",
    phase: "assess",
    priority: 3,
  },
  {
    id: "inc-1036",
    title: "Debris on carriageway",
    location: "Hill Road 04",
    severity: "moderate",
    riskScore: 52,
    populationExposure: 3400,
    infrastructureExposure: "2 roads",
    recommendedAction: "Routine clearance patrol",
    phase: "detect",
    priority: 4,
  },
];

export const RESPONSE_PHASES: {
  id: ResponsePhase;
  label: string;
  blurb: string;
}[] = [
  { id: "detect", label: "Detect", blurb: "Sensors & satellite flag anomalies" },
  { id: "assess", label: "Assess", blurb: "AI scores hazard & confidence" },
  { id: "prioritize", label: "Prioritize", blurb: "Rank by population & exposure" },
  { id: "respond", label: "Respond", blurb: "Dispatch, advise, protect" },
];
