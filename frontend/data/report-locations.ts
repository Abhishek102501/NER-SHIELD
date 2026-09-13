import { VILLAGES } from "@/data/infrastructure";
import { INCIDENTS } from "@/data/incidents";

/**
 * Real, named locations a field report can be filed against — reused from
 * the app's own village and incident datasets rather than inventing new
 * coordinates, so every report a demo user files has a genuine map position.
 * Distinct from data/locations.ts's `LOCATIONS` (the richer monitored-zone
 * risk profiles used by RiskExplorer/WhatIfPanel) — this is just name+point.
 */
export interface ReportLocation {
  label: string;
  lngLat: [number, number];
}

const villageLocations: ReportLocation[] = VILLAGES.map((v) => ({
  label: v.name,
  lngLat: v.center,
}));

const incidentLocations: ReportLocation[] = INCIDENTS.filter(
  (i): i is typeof i & { lngLat: [number, number] } => !!i.lngLat,
).map((i) => ({ label: i.location, lngLat: i.lngLat }));

// De-duplicate by label, keep first occurrence.
const seen = new Set<string>();
export const REPORT_LOCATIONS: ReportLocation[] = [...incidentLocations, ...villageLocations].filter(
  (loc) => {
    if (seen.has(loc.label)) return false;
    seen.add(loc.label);
    return true;
  },
);
