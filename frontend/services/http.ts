/**
 * Mock transport. Every service call funnels through here so that switching to
 * the real backend is a single-file change: flip USE_MOCK and implement fetch().
 */
export const USE_MOCK = true;

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
