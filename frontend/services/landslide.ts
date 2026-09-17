import type {
  LandslideAnalysisResult,
  LandslideAnalysisStatus,
  LandslideHealth,
} from "@/types/landslide";
import { LANDSLIDE_ANALYZE_URL, LANDSLIDE_HEALTH_URL, landslideAnalysisUrl } from "./endpoints";

const VALID_STATUSES: readonly string[] = [
  "queued",
  "preprocessing",
  "running",
  "postprocessing",
  "completed",
  "failed",
  "cancelled",
];

function isAnalysisStatus(value: unknown): value is LandslideAnalysisStatus {
  return typeof value === "string" && VALID_STATUSES.includes(value);
}

/** Structural check — real backend responses only, no local fallback: a fake
 * "completed" analysis would violate the "never fake the model" requirement. */
function isAnalysisResult(value: unknown): value is LandslideAnalysisResult {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.analysisId === "string" &&
    isAnalysisStatus(v.status) &&
    (v.mode === "real" || v.mode === "mock")
  );
}

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

/** GET /api/landslide/health — real backend, proxying the Python AI service. Returns
 * `null` if unreachable (the caller decides how to degrade — never fabricates health). */
export async function getLandslideHealth(): Promise<LandslideHealth | null> {
  try {
    const json = await fetchJson(LANDSLIDE_HEALTH_URL);
    return json as LandslideHealth;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[landslide] health check failed:", err);
    }
    return null;
  }
}

/**
 * POST /api/landslide/analyze — starts an analysis against the AI service's built-in
 * synthetic demo scene. Throws on failure; callers must show a real error, never a
 * fabricated result (see ml-service section 39: never fake the model).
 */
export async function startLandslideDemoAnalysis(): Promise<LandslideAnalysisResult> {
  const json = await fetchJson(`${LANDSLIDE_ANALYZE_URL}?demoDataset=true`, { method: "POST" });
  if (!isAnalysisResult(json)) {
    throw new Error("Malformed /api/landslide/analyze response");
  }
  return json;
}

/** GET /api/landslide/analysis/{id} — polls analysis status/result. Throws on failure. */
export async function getLandslideAnalysis(analysisId: string): Promise<LandslideAnalysisResult> {
  const json = await fetchJson(landslideAnalysisUrl(analysisId));
  if (!isAnalysisResult(json)) {
    throw new Error("Malformed /api/landslide/analysis response");
  }
  return json;
}
