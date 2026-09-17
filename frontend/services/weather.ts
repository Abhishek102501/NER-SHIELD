import type { CurrentWeather } from "@/types/weather";
import { weatherCurrentUrl } from "./endpoints";

function isCurrentWeather(value: unknown): value is CurrentWeather {
  return typeof value === "object" && value !== null && typeof (value as { available?: unknown }).available === "boolean";
}

const UNREACHABLE: CurrentWeather = {
  available: false,
  provider: null,
  source: null,
  sourceUrl: null,
  fetchedAt: null,
  latitude: null,
  longitude: null,
  temperatureCelsius: null,
  windSpeedKph: null,
  relativeHumidityPercent: null,
  precipitationMm: null,
  reason: "Backend unreachable — could not check weather provider status.",
};

/**
 * GET /api/weather/current — real backend (`backend/.../weather/WeatherController`),
 * itself a live call to Open-Meteo. Unlike `getThreats()`/`getIncidents()`/etc., this has
 * NO demo-data fallback: weather that can't be verified live is not weather worth showing,
 * so any failure (network, timeout, malformed response) surfaces as `available: false` with
 * an explanatory `reason` — never a plausible-looking fake reading.
 */
export async function getCurrentWeather(latitude: number, longitude: number): Promise<CurrentWeather> {
  const url = weatherCurrentUrl(latitude, longitude);
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
    if (!isCurrentWeather(json)) {
      throw new Error("Malformed /api/weather/current response");
    }
    return json;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[weather] backend unreachable, reporting unavailable (no fake fallback):", err);
    }
    return UNREACHABLE;
  }
}
