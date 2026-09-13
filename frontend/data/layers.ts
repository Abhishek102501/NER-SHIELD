import type { LayerGroupId, MapLayer } from "@/types";

/**
 * Map layer catalogue. Every entry here drives a real MapLibre layer, DOM marker
 * group, or map behavior — see `applyLayerVisibility` / the marker-visibility effect
 * in `LiveMap.tsx`. Nothing in this list is UI-only.
 *
 * Categories mirror a professional GIS layer panel (Natural / Transport /
 * Settlements / Infrastructure / Risk / Response). Forest, land-cover, lakes,
 * glaciers and administrative boundaries are real OpenStreetMap geography baked
 * into the basemap tiles themselves (see LiveMap's raster source) — they render
 * without a toggle here because a raster image can't be split into independently
 * togglable sub-layers. Nothing below is invented data: every toggle maps to a
 * feature that already exists in the app's real (if demo-scale) datasets.
 */
export const MAP_LAYERS: MapLayer[] = [
  // NATURAL
  { id: "terrain-3d", label: "3D Terrain", group: "natural", defaultOn: true },
  { id: "labels", label: "Geographic Labels", group: "natural", defaultOn: true },
  { id: "rivers", label: "Rivers", group: "natural", defaultOn: true },

  // TRANSPORT
  { id: "roads", label: "Roads & Highways", group: "transport", defaultOn: true },
  { id: "bridges", label: "Bridges", group: "transport", defaultOn: true },

  // SETTLEMENTS
  { id: "villages", label: "Villages", group: "settlements", defaultOn: true },
  { id: "schools", label: "Schools", group: "settlements", defaultOn: true },

  // INFRASTRUCTURE
  { id: "hospitals", label: "Hospitals", group: "infrastructure", defaultOn: true },
  { id: "shelters", label: "Relief Shelters", group: "infrastructure", defaultOn: true },

  // RISK
  { id: "risk-zones", label: "All Risk Zones", group: "risk", defaultOn: true },
  { id: "hazard-landslide", label: "Landslide Risk", group: "risk", defaultOn: true },
  { id: "hazard-flood", label: "Flood Risk", group: "risk", defaultOn: true },

  // RESPONSE
  { id: "critical-incidents", label: "Critical Incidents", group: "response", defaultOn: true },
  { id: "high-incidents", label: "High Incidents", group: "response", defaultOn: true },
  { id: "moderate-incidents", label: "Moderate Incidents", group: "response", defaultOn: true },
  { id: "low-incidents", label: "Low Incidents", group: "response", defaultOn: true },
  { id: "evacuation-routes", label: "Emergency / Evacuation Routes", group: "response", defaultOn: true },
];

export const LAYER_GROUPS: { id: LayerGroupId; label: string }[] = [
  { id: "natural", label: "Natural" },
  { id: "transport", label: "Transport" },
  { id: "settlements", label: "Settlements" },
  { id: "infrastructure", label: "Infrastructure" },
  { id: "risk", label: "Risk" },
  { id: "response", label: "Response" },
];

/** Default on/off map keyed by layer id, derived from the catalogue. */
export const DEFAULT_LAYER_STATE: Record<string, boolean> = Object.fromEntries(
  MAP_LAYERS.map((l) => [l.id, l.defaultOn]),
);
