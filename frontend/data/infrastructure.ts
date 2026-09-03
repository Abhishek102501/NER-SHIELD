import type { InfraPoint } from "@/types";

/**
 * DEMO / MOCK DATA — infrastructure & settlements across the demonstration
 * region. Single source of truth; the GeoJSON in data/geo.ts is built from this.
 * Replaceable by `/api/v1/gis/layers/{layer}`.
 */
export const VILLAGES: InfraPoint[] = [
  { id: "v-rangpo", name: "Rangpo", kind: "village", center: [88.53, 27.18] },
  { id: "v-singtam", name: "Singtam", kind: "village", center: [88.5, 27.23] },
  { id: "v-melli", name: "Melli", kind: "village", center: [88.46, 27.06] },
  { id: "v-rhenock", name: "Rhenock", kind: "village", center: [88.68, 27.19] },
  { id: "v-pakyong", name: "Pakyong", kind: "village", center: [88.6, 27.24] },
];

export const HOSPITALS: InfraPoint[] = [
  { id: "h-district", name: "District Hospital", kind: "hospital", center: [88.52, 27.16] },
  { id: "h-singtam", name: "Singtam PHC", kind: "hospital", center: [88.49, 27.22] },
];

export const SCHOOLS: InfraPoint[] = [
  { id: "s-rangpo", name: "Rangpo Sr. Sec. School", kind: "school", center: [88.535, 27.172] },
  { id: "s-melli", name: "Melli Primary School", kind: "school", center: [88.462, 27.064] },
  { id: "s-rhenock", name: "Rhenock Academy", kind: "school", center: [88.676, 27.186] },
];

export const BRIDGES: InfraPoint[] = [
  { id: "b-teesta", name: "Teesta Bridge", kind: "bridge", center: [88.54, 27.1] },
  { id: "b-rangpo", name: "Rangpo Rail Bridge", kind: "bridge", center: [88.527, 27.176] },
];

export const DEPOTS: InfraPoint[] = [
  { id: "d-relief", name: "Relief Depot", kind: "depot", center: [88.49, 27.2] },
];

/** Everything except villages, rendered as the "infrastructure" map layer. */
export const INFRASTRUCTURE_POINTS: InfraPoint[] = [
  ...HOSPITALS,
  ...SCHOOLS,
  ...BRIDGES,
  ...DEPOTS,
];

export const INFRA_SUMMARY = {
  villages: VILLAGES.length,
  hospitals: HOSPITALS.length,
  schools: SCHOOLS.length,
  bridges: BRIDGES.length,
  roads: 2,
} as const;
