/**
 * Mock transport. Every service call funnels through here so that switching to
 * the real backend is a single-file change: flip USE_MOCK and implement fetch().
 *
 * Defaults to mock (matches the historical hardcoded `true`) so nothing changes for the
 * domains still on this path. Set `NEXT_PUBLIC_USE_MOCK=false` to disable it once a given
 * domain's backend is ready — threats, risk zones and incidents no longer go through this
 * function at all (see services/threats.ts, services/risk.ts, services/ops.ts), so this only
 * affects what's still mocked (field reports, alerts, simulations, GIS layers).
 */
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

const wait = (ms: number) =>
  new Promise<void>((res) => setTimeout(res, ms));

/**
 * Resolve an endpoint. Today it returns the provided mock payload after a small
 * simulated latency. Tomorrow, replace the mock branch with a real `fetch`.
 */
export async function request<T>(
  endpoint: string,
  mock: T,
  { delay = 220, method = "GET" }: { delay?: number; method?: string } = {},
): Promise<T> {
  if (USE_MOCK) {
    await wait(delay);
    return structuredCloneSafe(mock);
  }
  // --- Real backend (future) -------------------------------------------
  // const res = await fetch(endpoint, { method });
  // if (!res.ok) throw new Error(`${method} ${endpoint} → ${res.status}`);
  // return (await res.json()) as T;
  // ---------------------------------------------------------------------
  void method;
  throw new Error(`Live backend not configured for ${endpoint}`);
}

function structuredCloneSafe<T>(v: T): T {
  try {
    return structuredClone(v);
  } catch {
    return JSON.parse(JSON.stringify(v)) as T;
  }
}
