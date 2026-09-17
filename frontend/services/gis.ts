import { gisLayerBackendUrl } from "./endpoints";

function isFeatureCollection(value: unknown): value is GeoJSON.FeatureCollection {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "FeatureCollection" &&
    Array.isArray((value as { features?: unknown }).features)
  );
}

/**
 * GET /api/gis/layers/{id} — real backend (`backend/.../gis/GisController`). Returns `null`
 * (never a fabricated value) if the backend is unreachable, times out, or returns something
 * that isn't a valid GeoJSON FeatureCollection — callers keep whatever demo GeoJSON they
 * already rendered on `null`, matching the rest of the app's same-first-paint-then-upgrade
 * pattern (see `services/threats.ts`).
 */
export async function getGisLayer(id: string): Promise<GeoJSON.FeatureCollection | null> {
  const url = gisLayerBackendUrl(id);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let res: Response;
    try {
      res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      throw new Error(`GET ${url} -> ${res.status}`);
    }

    const json: unknown = await res.json();
    if (!isFeatureCollection(json)) {
      throw new Error(`Malformed GeoJSON from ${url}`);
    }
    return json;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[gis] backend unavailable for layer "${id}", keeping demonstration data:`, err);
    }
    return null;
  }
}
