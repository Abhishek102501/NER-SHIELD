import type { InfraPoint, Severity } from "@/types";
import {
  INFRASTRUCTURE_POINTS,
  SCHOOLS as SCHOOLS_DATA,
  VILLAGES as VILLAGES_DATA,
} from "@/data/infrastructure";

/**
 * DEMONSTRATION GeoJSON for the GIS command center (self-contained — no external
 * tile server required). Coordinates are indicative of the Sikkim / Darjeeling
 * Himalaya and are NOT surveyed geodata. Replaceable by `/api/v1/gis/layers/{layer}`.
 */

type FC = GeoJSON.FeatureCollection;

const SEVERITY_TINT: Record<Severity, string> = {
  low: "#22c55e",
  moderate: "#eab308",
  high: "#f97316",
  critical: "#ef4444",
};
export const GEO_SEVERITY_TINT = SEVERITY_TINT;

/** Irregular polygon ring around a center (deg radius), lightly perturbed. */
function blob(
  lng: number,
  lat: number,
  r: number,
  seedOffsets: number[],
): [number, number][] {
  const pts: [number, number][] = [];
  const n = seedOffsets.length;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.72 + seedOffsets[i] * 0.5);
    pts.push([
      +(lng + Math.cos(a) * rr * 1.15).toFixed(4),
      +(lat + Math.sin(a) * rr).toFixed(4),
    ]);
  }
  pts.push(pts[0]);
  return pts;
}

export const RISK_ZONES: FC = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        id: "nh10-sikkim",
        name: "NH-10 Corridor",
        band: "critical",
        risk: 87,
        rainfall: 142,
        population: 12800,
        roadsAtRisk: 7,
        recommendedAction: "Immediate closure review & field verification",
        color: SEVERITY_TINT.critical,
      },
      geometry: {
        type: "Polygon",
        coordinates: [blob(88.53, 27.17, 0.09, [0.2, 0.8, 0.4, 0.9, 0.3, 0.7, 0.5, 0.6])],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "east-district",
        name: "East District Ridge",
        band: "high",
        risk: 74,
        rainfall: 128,
        population: 8300,
        roadsAtRisk: 4,
        recommendedAction: "Heighten monitoring; stage response teams",
        color: SEVERITY_TINT.high,
      },
      geometry: {
        type: "Polygon",
        coordinates: [blob(88.68, 27.24, 0.07, [0.6, 0.3, 0.7, 0.4, 0.8, 0.5, 0.3, 0.6])],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "teesta-basin",
        name: "Teesta Basin",
        band: "high",
        risk: 71,
        rainfall: 118,
        population: 9600,
        roadsAtRisk: 4,
        recommendedAction: "Flood watch; advise low-lying settlements",
        color: SEVERITY_TINT.high,
      },
      geometry: {
        type: "Polygon",
        coordinates: [blob(88.53, 27.02, 0.08, [0.5, 0.7, 0.3, 0.6, 0.4, 0.8, 0.5, 0.4])],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "hill-road-04",
        name: "Hill Road 04 Sector",
        band: "moderate",
        risk: 52,
        rainfall: 86,
        population: 3400,
        roadsAtRisk: 2,
        recommendedAction: "Routine patrol; clear minor debris",
        color: SEVERITY_TINT.moderate,
      },
      geometry: {
        type: "Polygon",
        coordinates: [blob(88.42, 27.09, 0.06, [0.4, 0.5, 0.6, 0.4, 0.5, 0.6, 0.4, 0.5])],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "west-ridge",
        name: "West Ridge Array",
        band: "low",
        risk: 34,
        rainfall: 54,
        population: 1900,
        roadsAtRisk: 1,
        recommendedAction: "Nominal; continue sensor calibration",
        color: SEVERITY_TINT.low,
      },
      geometry: {
        type: "Polygon",
        coordinates: [blob(88.36, 27.2, 0.055, [0.5, 0.4, 0.5, 0.6, 0.4, 0.5, 0.6, 0.5])],
      },
    },
  ],
};

export const ROADS: FC = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "NH-10", cls: "national" },
      geometry: {
        type: "LineString",
        coordinates: [
          [88.36, 27.28],
          [88.46, 27.2],
          [88.53, 27.14],
          [88.55, 27.05],
          [88.52, 26.95],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "Hill Road 04", cls: "district" },
      geometry: {
        type: "LineString",
        coordinates: [
          [88.4, 27.12],
          [88.45, 27.09],
          [88.5, 27.1],
          [88.6, 27.13],
        ],
      },
    },
  ],
};

export const RIVERS: FC = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Teesta" },
      geometry: {
        type: "LineString",
        coordinates: [
          [88.55, 27.35],
          [88.54, 27.2],
          [88.53, 27.05],
          [88.5, 26.9],
        ],
      },
    },
  ],
};

const pointsToFC = (points: InfraPoint[]): FC => ({
  type: "FeatureCollection",
  features: points.map((p) => ({
    type: "Feature" as const,
    properties: { id: p.id, name: p.name, kind: p.kind },
    geometry: { type: "Point" as const, coordinates: p.center },
  })),
});

export const VILLAGES: FC = pointsToFC(VILLAGES_DATA);
export const SCHOOLS: FC = pointsToFC(SCHOOLS_DATA);
export const INFRASTRUCTURE: FC = pointsToFC(INFRASTRUCTURE_POINTS);

export const INCIDENT_POINTS: FC = {
  type: "FeatureCollection",
  features: [
    ["inc-1042", "NH-10 / Sikkim", "critical", 88.53, 27.15],
    ["inc-1039", "East District", "high", 88.66, 27.23],
    ["inc-1036", "Hill Road 04", "moderate", 88.45, 27.1],
    ["inc-1031", "Teesta Basin", "high", 88.52, 27.0],
  ].map(([id, name, band, lng, lat]) => ({
    type: "Feature" as const,
    properties: { id, name, band, color: SEVERITY_TINT[band as Severity] },
    geometry: { type: "Point" as const, coordinates: [lng as number, lat as number] },
  })),
};

/** Rainfall intensity overlay (heat points). */
export const RAINFALL_OVERLAY: FC = {
  type: "FeatureCollection",
  features: Array.from({ length: 26 }, (_, i) => {
    const ring = 0.02 + (i % 5) * 0.03;
    const a = (i / 26) * Math.PI * 2;
    const lng = 88.53 + Math.cos(a) * ring * 2.4;
    const lat = 27.14 + Math.sin(a) * ring * 1.6;
    const intensity = 0.4 + ((i * 37) % 60) / 100;
    return {
      type: "Feature" as const,
      properties: { intensity },
      geometry: { type: "Point" as const, coordinates: [+lng.toFixed(4), +lat.toFixed(4)] },
    };
  }),
};

export const MAP_CENTER: [number, number] = [88.53, 27.14];
export const MAP_ZOOM = 9.4;
