import type { Severity } from "@/types";

/**
 * Risk hotspots overlaid on the hero's NE-India wireframe map. Coordinates are real
 * [lng, lat] — the same Guwahati / Shillong points used as demo events elsewhere in
 * the app (see data/timeline.ts) — projected into the map's viewBox space via
 * `makeNeProjector` at render time, not laid out by eyeballed screen percentages.
 */
export interface HeroHotspot {
  id: string;
  label: string;
  detail: string;
  severity: Extract<Severity, "high" | "moderate">;
  /** [lng, lat] */
  lngLat: [number, number];
}

export const HERO_HOTSPOTS: HeroHotspot[] = [
  { id: "h1", label: "High Risk", detail: "Heavy Rainfall", severity: "high", lngLat: [91.7362, 26.1445] },
  { id: "h2", label: "Medium Risk", detail: "Slope Instability", severity: "moderate", lngLat: [91.8933, 25.5788] },
];
