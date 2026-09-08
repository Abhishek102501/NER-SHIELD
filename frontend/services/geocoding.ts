/**
 * Location search for the Command Center map — OSM Nominatim (free, no API key,
 * same "no external key required" precedent as the CARTO base style in LiveMap.tsx).
 * Base URL is swappable via NEXT_PUBLIC_GEOCODING_URL (self-hosted Nominatim, or a
 * future backend proxy) without touching this file.
 */

export type LocationCategory =
  | "country"
  | "state"
  | "city"
  | "district"
  | "village"
  | "landmark"
  | "coordinate";

export interface LocationResult {
  id: string;
  /** Primary display name, e.g. "Gangtok". */
  label: string;
  /** Secondary context, e.g. "East Sikkim, Sikkim, India". */
  subLabel: string;
  category: LocationCategory;
  lat: number;
  lon: number;
  /** [west, south, east, north] — present for admin areas (country/state/district). */
  boundingBox: [number, number, number, number] | null;
}

const GEOCODING_BASE_URL =
  process.env.NEXT_PUBLIC_GEOCODING_URL ?? "https://nominatim.openstreetmap.org";

const CATEGORY_BY_TYPE: Record<string, LocationCategory> = {
  country: "country",
  state: "state",
  region: "state",
  province: "state",
  city: "city",
  town: "city",
  municipality: "city",
  county: "district",
  district: "district",
  state_district: "district",
  suburb: "district",
  village: "village",
  hamlet: "village",
  isolated_dwelling: "village",
};

function categoryFor(addresstype: string | undefined, type: string | undefined): LocationCategory {
  const key = (addresstype ?? type ?? "").toLowerCase();
  return CATEGORY_BY_TYPE[key] ?? "landmark";
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  type?: string;
  addresstype?: string;
  boundingbox?: [string, string, string, string];
}

/** Recognizes free-typed "lat, lng" / "lat lng" input and skips the network entirely. */
export function parseCoordinateInput(query: string): LocationResult | null {
  const match = query.trim().match(
    /^(-?\d{1,3}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)$/,
  );
  if (!match) return null;

  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

  return {
    id: `coord:${lat},${lon}`,
    label: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    subLabel: "Coordinate",
    category: "coordinate",
    lat,
    lon,
    boundingBox: null,
  };
}

export class GeocodingError extends Error {}

/**
 * Searches countries, states, cities, districts, villages and landmarks by name.
 * Pass an AbortSignal so callers (MapSearch's debounced input) can cancel a
 * superseded request instead of racing stale results against the latest query.
 */
export async function searchLocations(
  query: string,
  { signal }: { signal?: AbortSignal } = {},
): Promise<LocationResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = new URL("/search", GEOCODING_BASE_URL);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "8");

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      signal,
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new GeocodingError("Location search is unreachable right now.");
  }

  if (!res.ok) {
    throw new GeocodingError(`Location search failed (${res.status}).`);
  }

  const data = (await res.json()) as NominatimResult[];

  return data.map((r): LocationResult => {
    const [nameLabel, ...rest] = r.display_name.split(", ");
    const bbox = r.boundingbox;
    return {
      id: `place:${r.place_id}`,
      label: r.name || nameLabel,
      subLabel: rest.join(", "),
      category: categoryFor(r.addresstype, r.type),
      lat: Number(r.lat),
      lon: Number(r.lon),
      boundingBox: bbox
        ? [Number(bbox[2]), Number(bbox[0]), Number(bbox[3]), Number(bbox[1])]
        : null,
    };
  });
}
