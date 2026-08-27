import type { LocationProfile } from "@/types";

/**
 * DEMONSTRATION monitored-location profiles for the North Eastern Region.
 * Structured to be swapped for `/api/v1/risk/zones` + `/api/v1/risk/{id}` later.
 * Not live data.
 */
export const LOCATIONS: LocationProfile[] = [
  {
    id: "nh10-sikkim",
    name: "NH-10 Corridor",
    sector: "Sikkim · Teesta Valley",
    center: [88.53, 27.17],
    risk: {
      value: 87,
      band: "critical",
      confidence: 91,
      deltaLabel: "+12.6% / 6H",
      deltaDirection: "up",
    },
    factors: [
      { id: "rainfall", label: "Rainfall", weight: 34, severity: "critical" },
      { id: "soil", label: "Soil Moisture", weight: 24, severity: "high" },
      { id: "slope", label: "Slope", weight: 18, severity: "high" },
      { id: "historical", label: "Historical", weight: 13, severity: "moderate" },
      { id: "satellite", label: "Satellite Change", weight: 7, severity: "moderate" },
      { id: "terrain", label: "Terrain", weight: 4, severity: "low" },
    ],
    metrics: {
      rainfall24h: 142,
      rainfall72h: 287,
      soilMoisture: 82,
      slope: 41,
      elevation: 1240,
    },
    drivers: [
      {
        id: "d1",
        label: "Extreme rainfall accumulation",
        detail: "287 mm over 72h — 2.4× the seasonal alert threshold.",
        contribution: 34,
        severity: "critical",
      },
      {
        id: "d2",
        label: "High soil moisture",
        detail: "Saturation at 82%, past the 70% failure threshold.",
        contribution: 24,
        severity: "high",
      },
      {
        id: "d3",
        label: "Steep terrain",
        detail: "Cut-slope gradient of 41° along the NH-10 corridor.",
        contribution: 18,
        severity: "high",
      },
      {
        id: "d4",
        label: "Historical susceptibility",
        detail: "9 recorded slope failures in this reach since 2011.",
        contribution: 13,
        severity: "moderate",
      },
    ],
    impact: {
      villages: 4,
      roads: 7,
      bridges: 2,
      hospitals: 1,
      populationExposure: 12800,
    },
    activeIncidents: 3,
  },
  {
    id: "meghalaya-s04",
    name: "Meghalaya Sector 04",
    sector: "East Khasi Hills",
    center: [91.74, 25.45],
    risk: {
      value: 79,
      band: "high",
      confidence: 88,
      deltaLabel: "+9.1% / 6H",
      deltaDirection: "up",
    },
    factors: [
      { id: "rainfall", label: "Rainfall", weight: 38, severity: "critical" },
      { id: "soil", label: "Soil Moisture", weight: 22, severity: "high" },
      { id: "slope", label: "Slope", weight: 15, severity: "moderate" },
      { id: "historical", label: "Historical", weight: 14, severity: "moderate" },
      { id: "satellite", label: "Satellite Change", weight: 7, severity: "moderate" },
      { id: "terrain", label: "Terrain", weight: 4, severity: "low" },
    ],
    metrics: {
      rainfall24h: 168,
      rainfall72h: 341,
      soilMoisture: 77,
      slope: 33,
      elevation: 1490,
    },
    drivers: [
      {
        id: "d1",
        label: "Record rainfall band",
        detail: "341 mm / 72h across the Cherrapunji orographic belt.",
        contribution: 38,
        severity: "critical",
      },
      {
        id: "d2",
        label: "Saturated regolith",
        detail: "Thin soil over bedrock saturated to 77%.",
        contribution: 22,
        severity: "high",
      },
      {
        id: "d3",
        label: "Historical susceptibility",
        detail: "Repeated debris flows recorded along Sector 04.",
        contribution: 14,
        severity: "moderate",
      },
      {
        id: "d4",
        label: "Slope gradient",
        detail: "33° escarpment above the settlement cluster.",
        contribution: 15,
        severity: "moderate",
      },
    ],
    impact: {
      villages: 6,
      roads: 5,
      bridges: 1,
      hospitals: 1,
      populationExposure: 18400,
    },
    activeIncidents: 2,
  },
  {
    id: "teesta-basin",
    name: "Teesta Basin",
    sector: "Sikkim · Rangpo",
    center: [88.53, 27.02],
    risk: {
      value: 71,
      band: "high",
      confidence: 85,
      deltaLabel: "+6.4% / 6H",
      deltaDirection: "up",
    },
    factors: [
      { id: "rainfall", label: "Rainfall", weight: 30, severity: "high" },
      { id: "soil", label: "Soil Moisture", weight: 20, severity: "high" },
      { id: "river", label: "River Discharge", weight: 26, severity: "high" },
      { id: "historical", label: "Historical", weight: 14, severity: "moderate" },
      { id: "terrain", label: "Terrain", weight: 10, severity: "low" },
    ],
    metrics: {
      rainfall24h: 118,
      rainfall72h: 236,
      soilMoisture: 74,
      slope: 22,
      elevation: 300,
    },
    drivers: [
      {
        id: "d1",
        label: "Rising river discharge",
        detail: "Upstream release climbing above the 6-hour forecast band.",
        contribution: 26,
        severity: "high",
      },
      {
        id: "d2",
        label: "Sustained rainfall",
        detail: "236 mm / 72h feeding the catchment.",
        contribution: 30,
        severity: "high",
      },
      {
        id: "d3",
        label: "Valley-floor exposure",
        detail: "Low-lying settlements within the flood envelope.",
        contribution: 20,
        severity: "high",
      },
    ],
    impact: {
      villages: 5,
      roads: 4,
      bridges: 3,
      hospitals: 0,
      populationExposure: 9600,
    },
    activeIncidents: 1,
  },
  {
    id: "aizawl-ridge",
    name: "Aizawl Ridge",
    sector: "Mizoram",
    center: [92.72, 23.73],
    risk: {
      value: 54,
      band: "moderate",
      confidence: 83,
      deltaLabel: "+3.2% / 6H",
      deltaDirection: "up",
    },
    factors: [
      { id: "rainfall", label: "Rainfall", weight: 28, severity: "moderate" },
      { id: "soil", label: "Soil Moisture", weight: 22, severity: "moderate" },
      { id: "slope", label: "Slope", weight: 24, severity: "high" },
      { id: "historical", label: "Historical", weight: 16, severity: "moderate" },
      { id: "terrain", label: "Terrain", weight: 10, severity: "low" },
    ],
    metrics: {
      rainfall24h: 74,
      rainfall72h: 149,
      soilMoisture: 61,
      slope: 37,
      elevation: 1130,
    },
    drivers: [
      {
        id: "d1",
        label: "Steep urban slopes",
        detail: "Dense hillside construction on 37° gradients.",
        contribution: 24,
        severity: "high",
      },
      {
        id: "d2",
        label: "Moderate rainfall",
        detail: "149 mm / 72h — below critical but rising.",
        contribution: 28,
        severity: "moderate",
      },
    ],
    impact: {
      villages: 2,
      roads: 3,
      bridges: 0,
      hospitals: 1,
      populationExposure: 21500,
    },
    activeIncidents: 1,
  },
];

export const DEFAULT_LOCATION_ID = LOCATIONS[0].id;

export function getLocation(id: string): LocationProfile {
  return LOCATIONS.find((l) => l.id === id) ?? LOCATIONS[0];
}
