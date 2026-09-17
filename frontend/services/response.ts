import { RESPONSE_UNITS, type ResponseUnit } from "@/data/response";
import { RESPONSE_DISPATCH_URL, RESPONSE_UNITS_URL } from "./endpoints";

const VALID_UNIT_KINDS: readonly string[] = ["NDRF", "SDRF", "Police", "Medical", "Engineering"];

function isResponseUnitKind(value: unknown): value is ResponseUnit["kind"] {
  return typeof value === "string" && VALID_UNIT_KINDS.includes(value);
}

/** Structural check that a value is shaped like a {@link ResponseUnit}. */
function isResponseUnit(value: unknown): value is ResponseUnit {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.label === "string" &&
    isResponseUnitKind(v.kind) &&
    typeof v.base === "string" &&
    typeof v.etaMinutes === "number"
  );
}

/**
 * GET /api/response/units — real backend (`backend/.../response/ResponseController`). Falls
 * back to the local `RESPONSE_UNITS` roster, unchanged, if the backend is unreachable, times
 * out, or returns something that doesn't validate — mirroring `getThreats()`.
 */
export async function getResponseUnits(): Promise<ResponseUnit[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let res: Response;
    try {
      res = await fetch(RESPONSE_UNITS_URL, { signal: controller.signal, cache: "no-store" });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      throw new Error(`GET ${RESPONSE_UNITS_URL} -> ${res.status}`);
    }

    const json: unknown = await res.json();
    if (!Array.isArray(json) || !json.every(isResponseUnit)) {
      throw new Error("Malformed /api/response/units response");
    }
    return json;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[response] backend unavailable, using demonstration unit roster:", err);
    }
    return RESPONSE_UNITS;
  }
}

/**
 * POST /api/response/dispatch — records a real dispatch assignment in the backend. Best
 * effort: the command-center UI's own optimistic local state (see
 * `command-context.tsx`'s `dispatchUnit`) is the source of truth for the on-screen
 * experience, so a failed/unreachable backend call is logged, not surfaced as an error —
 * this call exists to persist the action, not to gate the UI on it.
 */
export async function recordDispatch(
  incidentId: string,
  unitId: string,
  priority: string,
  notes: string,
): Promise<void> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(RESPONSE_DISPATCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId, unitId, priority, notes }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`POST ${RESPONSE_DISPATCH_URL} -> ${res.status}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[response] backend unavailable, dispatch recorded locally only:", err);
    }
  }
}
