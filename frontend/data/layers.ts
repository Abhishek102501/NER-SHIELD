import type { LayerGroupId, MapLayer } from "@/types";

/**
 * Map layer catalogue. Every entry here drives a real MapLibre layer, DOM marker
 * group, or map behavior — see `applyLayerVisibility` / the marker-visibility effect
 * in `LiveMap.tsx`. Nothing in this list is UI-only.
 */
export const MAP_LAYERS: MapLayer[] = [
  // BASE
  { id: "terrain-3d", label: "3D Terrain", group: "base", defaultOn: true },
  { id: "labels", label: "Geographic Labels", group: "base", defaultOn: true },
  { id: "roads", label: "Roads", group: "base", defaultOn: true },
  { id: "rivers", label: "Rivers", group: "base", defaultOn: true },

  // INTELLIGENCE
  { id: "risk-zones", label: "Risk Zones", group: "intelligence", defaultOn: true },
  { id: "critical-incidents", label: "Critical Risk", group: "intelligence", defaultOn: true },
  { id: "high-incidents", label: "High Risk", group: "intelligence", defaultOn: true },
  { id: "moderate-incidents", label: "Moderate Risk", group: "intelligence", defaultOn: true },
  { id: "low-incidents", label: "Low Risk", group: "intelligence", defaultOn: true },

  // INFRASTRUCTURE
  { id: "villages", label: "Villages", group: "infrastructure", defaultOn: true },
  { id: "sensors", label: "Sensors / Assets", group: "infrastructure", defaultOn: true },
];

export const LAYER_GROUPS: { id: LayerGroupId; label: string }[] = [
  { id: "base", label: "Base" },
  { id: "intelligence", label: "Intelligence" },
  { id: "infrastructure", label: "Infrastructure" },
];

/** Default on/off map keyed by layer id, derived from the catalogue. */
export const DEFAULT_LAYER_STATE: Record<string, boolean> = Object.fromEntries(
  MAP_LAYERS.map((l) => [l.id, l.defaultOn]),
);
