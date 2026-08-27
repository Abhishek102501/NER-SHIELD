import {
  INCIDENT_POINTS,
  INFRASTRUCTURE,
  RAINFALL_OVERLAY,
  RISK_ZONES,
  RIVERS,
  ROADS,
  VILLAGES,
} from "@/data/geo";
import { ENDPOINTS, type GisLayerName } from "./endpoints";
import { request } from "./http";

const LAYERS: Record<GisLayerName, GeoJSON.FeatureCollection> = {
  "risk-zones": RISK_ZONES,
  roads: ROADS,
  rivers: RIVERS,
  villages: VILLAGES,
  infrastructure: INFRASTRUCTURE,
  incidents: INCIDENT_POINTS,
  rainfall: RAINFALL_OVERLAY,
};

/** GET /api/v1/gis/layers/{layer} */
export function getGisLayer(
  layer: GisLayerName,
): Promise<GeoJSON.FeatureCollection> {
  return request(ENDPOINTS.gisLayer(layer), LAYERS[layer]);
}

/** Synchronous access for the map's initial paint (avoids layer flicker). */
export function gisLayers() {
  return LAYERS;
}
