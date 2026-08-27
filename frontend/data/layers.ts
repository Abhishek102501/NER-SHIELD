import type { LayerGroupId, MapLayer } from "@/types";

/**
 * Map layer catalogue. For Milestone 1 these only drive frontend UI state;
 * real MapLibre layers are wired in Milestone 2.
 */
export const MAP_LAYERS: MapLayer[] = [
  // BASE
  { id: "satellite", label: "Satellite", group: "base", defaultOn: true },
  { id: "terrain", label: "Terrain", group: "base", defaultOn: true },
  { id: "roads", label: "Roads", group: "base", defaultOn: false },
  { id: "rivers", label: "Rivers", group: "base", defaultOn: false },
  { id: "boundaries", label: "Boundaries", group: "base", defaultOn: false },

  // INTELLIGENCE
  { id: "risk-zones", label: "Risk Zones", group: "intelligence", defaultOn: true },
  {
    id: "historical-landslides",
    label: "Historical Landslides",
    group: "intelligence",
    defaultOn: true,
  },
  { id: "incidents", label: "Incidents", group: "intelligence", defaultOn: true },
  { id: "sensors", label: "Sensors", group: "intelligence", defaultOn: false },
  { id: "field-reports", label: "Field Reports", group: "intelligence", defaultOn: false },

  // INFRASTRUCTURE
  { id: "villages", label: "Villages", group: "infrastructure", defaultOn: true },
  { id: "hospitals", label: "Hospitals", group: "infrastructure", defaultOn: true },
  { id: "bridges", label: "Bridges", group: "infrastructure", defaultOn: true },
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
