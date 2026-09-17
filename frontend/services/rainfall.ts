import type { RainfallExplanation, RainfallForecastResult, RainfallHealth } from "@/types/rainfall";
import { RAINFALL_EXPLAIN_DEMO_URL, RAINFALL_FORECAST_DEMO_URL, RAINFALL_HEALTH_URL } from "./endpoints";

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
    if (!res.ok) {
      throw new Error(`${init?.method ?? "GET"} ${url} -> ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

/** GET /api/rainfall/health — real backend. Returns `null` if unreachable. */
export async function getRainfallHealth(): Promise<RainfallHealth | null> {
  try {
    return (await fetchJson(RAINFALL_HEALTH_URL)) as RainfallHealth;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[rainfall] health check failed:", err);
    }
    return null;
  }
}

/** POST /api/rainfall/forecast/demo — runs the real LSTM pipeline against the AI service's
 * built-in synthetic demo window. Throws on failure; callers must show a real error, never a
 * fabricated forecast. */
export async function runRainfallDemoForecast(): Promise<RainfallForecastResult> {
  return (await fetchJson(RAINFALL_FORECAST_DEMO_URL, { method: "POST" })) as RainfallForecastResult;
}

/** POST /api/rainfall/explain/demo — SHAP (TreeSHAP, exact) attribution for one lead time of
 * the demo forecast. Only available when the AI service has the XGBoost co-forecaster loaded
 * (503 otherwise) — the LSTM alone can't be explained exactly. Throws on failure; callers must
 * show a real error, never a fabricated explanation. */
export async function explainRainfallDemoForecast(horizon = 0): Promise<RainfallExplanation> {
  const url = `${RAINFALL_EXPLAIN_DEMO_URL}?horizon=${horizon}`;
  return (await fetchJson(url, { method: "POST" })) as RainfallExplanation;
}
