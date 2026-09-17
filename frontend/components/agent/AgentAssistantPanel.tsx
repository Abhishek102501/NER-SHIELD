"use client";

import { AlertTriangle, Bot, CheckCircle2, Loader2, Send, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { askAgent, confirmProposedAction } from "@/services/agent";
import type { AgentChatMessage, ProposedAction } from "@/types/agent";
import { cn } from "@/lib/utils";

const SUGGESTED_QUESTIONS = [
  "What is the current situation in Gangtok?",
  "Is rainfall increasing the risk?",
  "What incidents are currently active?",
  "What response units are available?",
];

function DataOriginBadge({ dataOrigin }: { dataOrigin: string }) {
  const isReal = dataOrigin.startsWith("REAL_EXTERNAL");
  const isDemo = dataOrigin.includes("DEMO_SEED") || dataOrigin.includes("seed content");
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
        isReal && "bg-sev-low/10 text-sev-low",
        isDemo && "bg-sev-moderate/10 text-sev-moderate",
        !isReal && !isDemo && "bg-white/8 text-fg-dim",
      )}
    >
      {dataOrigin.split(" ")[0]}
    </span>
  );
}

/**
 * AI Disaster Response Agent chat panel. Self-contained (own floating trigger + drawer) so
 * it integrates without restructuring the existing command-center layout. Every answer
 * comes from `POST /api/agent/query` — no local fallback, no fabricated response; an
 * unavailable agent (no LLM configured, etc.) renders as an explicit notice, not silence or
 * a made-up answer. A proposed dispatch always requires an explicit second click here
 * before `confirmProposedAction` calls the real backend.
 */
export function AgentAssistantPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);

  const send = useCallback(
    async (query: string) => {
      if (!query.trim() || pending) return;
      const userMessage: AgentChatMessage = { id: `u-${Date.now()}`, role: "user", text: query };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setPending(true);

      const result = await askAgent(query);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: result.available
            ? (result.answer ?? "")
            : `AI agent unavailable — ${result.reason ?? "unknown reason"}`,
          result,
        },
      ]);
      setPending(false);
    },
    [pending],
  );

  const confirm = useCallback(async (action: ProposedAction, messageId: string) => {
    setPending(true);
    const result = await confirmProposedAction(action);
    setMessages((prev) => [
      ...prev,
      {
        id: `c-${messageId}`,
        role: "assistant",
        text: result.available
          ? (result.answer ?? "Dispatch confirmed.")
          : `Could not complete dispatch — ${result.reason ?? "unknown reason"}`,
        result,
      },
    ]);
    setPending(false);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open AI disaster response assistant"
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-black shadow-lg transition-transform hover:scale-105"
      >
        <Sparkles size={20} />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        variant="drawer"
        eyebrow="AI Disaster Response Agent"
        title="Assistant"
        icon={<Bot size={17} />}
      >
        <div className="flex h-full flex-col">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-[12px] text-fg-muted">
                  Ask about current weather, rainfall risk, active incidents, response units,
                  or disaster-preparedness guidance. Answers are grounded in live tool data —
                  if the agent can&apos;t verify something, it will say so rather than guess.
                </p>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="block w-full rounded-lg border border-white/10 px-3 py-2 text-left text-[12px] text-fg-muted transition-colors hover:border-accent/40 hover:text-fg"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={cn("rounded-xl p-3 text-[12px]", m.role === "user" ? "bg-white/[0.04]" : "border border-white/8 bg-white/[0.02]")}>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-fg-dim">
                  {m.role === "user" ? "You" : "Assistant"}
                </p>

                {m.role === "assistant" && m.result && !m.result.available && (
                  <div className="mb-1 flex items-center gap-1.5 text-sev-moderate">
                    <AlertTriangle size={13} />
                    <span className="text-[11px] font-semibold">Unavailable</span>
                  </div>
                )}

                <p className="whitespace-pre-wrap text-fg">{m.text}</p>

                {m.result && m.result.toolsUsed.length > 0 && (
                  <div className="mt-2 space-y-1 border-t border-white/8 pt-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-dim">
                      Tools used
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {m.result.toolsUsed.map((t, i) => (
                        <span key={`${t}-${i}`} className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {m.result && m.result.sources.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-dim">
                      Evidence
                    </p>
                    {m.result.sources.map((s, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[11px] text-fg-muted">
                        <DataOriginBadge dataOrigin={s.dataOrigin} />
                        <span>
                          {s.tool}: {s.summary}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {m.result?.requiresConfirmation && m.result.proposedAction && (
                  <div className="mt-3 rounded-lg border border-accent/30 bg-accent/5 p-2.5">
                    <p className="mb-2 text-[11px] font-semibold text-accent">
                      Proposed dispatch — requires your confirmation
                    </p>
                    <p className="mb-2 text-[11px] text-fg-muted">
                      Unit <span className="text-fg">{m.result.proposedAction.unitId}</span> →
                      incident <span className="text-fg">{m.result.proposedAction.incidentId}</span>
                      <br />
                      Reason: {m.result.proposedAction.reason}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => confirm(m.result!.proposedAction!, m.id)}
                        disabled={pending}
                        className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-[11px] font-semibold text-black disabled:opacity-50"
                      >
                        <CheckCircle2 size={13} /> Confirm dispatch
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {pending && (
              <div className="flex items-center gap-2 text-[11px] text-fg-dim">
                <Loader2 size={13} className="animate-spin" /> Thinking…
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 border-t border-white/8 pt-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="Ask about the current situation…"
              className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-fg placeholder:text-fg-dim focus:border-accent/50 focus:outline-none"
            />
            <button
              onClick={() => send(input)}
              disabled={pending || !input.trim()}
              aria-label="Send"
              className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-black disabled:opacity-40"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
