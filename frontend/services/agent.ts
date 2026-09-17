import type { AgentQueryResult, ProposedAction } from "@/types/agent";
import { AGENT_QUERY_URL } from "./endpoints";

const UNREACHABLE: AgentQueryResult = {
  available: false,
  answer: null,
  confidence: null,
  toolsUsed: [],
  sources: [],
  retrievedDocuments: [],
  recommendations: [],
  requiresConfirmation: false,
  proposedAction: null,
  reason: "Could not reach the AI agent service.",
};

async function post(body: unknown): Promise<AgentQueryResult> {
  try {
    const controller = new AbortController();
    // Agent turns can involve several tool calls plus an LLM round trip — longer budget
    // than the other services' 5s, but still bounded.
    const timeout = setTimeout(() => controller.abort(), 25000);

    let res: Response;
    try {
      res = await fetch(AGENT_QUERY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok && res.status !== 400 && res.status !== 503) {
      throw new Error(`POST ${AGENT_QUERY_URL} -> ${res.status}`);
    }

    const json = (await res.json()) as Partial<AgentQueryResult> & { message?: string };
    if (typeof json.available !== "boolean") {
      // 400/503 error payloads from GlobalExceptionHandler don't have `available` —
      // surface them as an honest unavailable result rather than a crash.
      return { ...UNREACHABLE, reason: json.message ?? UNREACHABLE.reason };
    }
    return { ...UNREACHABLE, ...json, available: json.available };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[agent] backend unreachable, reporting unavailable (no fake answer):", err);
    }
    return UNREACHABLE;
  }
}

/**
 * POST /api/agent/query with a natural-language question. No demo-data fallback: an
 * unavailable agent (no LLM configured, agent-service down, etc.) surfaces as
 * `available: false` with a `reason`, never a fabricated answer.
 */
export function askAgent(query: string): Promise<AgentQueryResult> {
  return post({ query });
}

/**
 * POST /api/agent/query with a previously-returned `proposedAction`, now explicitly
 * confirmed by the user. This is the ONLY path that actually executes a dispatch — the
 * agent itself never autonomously dispatches a unit.
 */
export function confirmProposedAction(action: ProposedAction): Promise<AgentQueryResult> {
  return post({ confirmedAction: { ...action, priority: "High" } });
}
