"use client";

import { CheckCircle2, Send, Truck } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { PRIORITY_LEVELS, RESPONSE_UNITS } from "@/data/response";
import { useCommand } from "@/lib/command-context";
import { SEVERITY, cn } from "@/lib/utils";

const SEVERITY_TO_PRIORITY: Record<string, (typeof PRIORITY_LEVELS)[number]> = {
  critical: "Critical",
  high: "High",
  moderate: "Elevated",
  low: "Routine",
};

export function DispatchModal() {
  const { dispatchTargetId, closeDispatch, incidents, dispatchUnit, permissions } = useCommand();
  const incident = incidents.find((i) => i.id === dispatchTargetId) ?? null;
  const open = !!incident;

  const [unitId, setUnitId] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITY_LEVELS)[number]>("High");
  const [notes, setNotes] = useState("");
  const [dispatching, setDispatching] = useState(false);
  const [done, setDone] = useState(false);

  const unit = RESPONSE_UNITS.find((u) => u.id === unitId);
  const canDispatch = !!unit && permissions.dispatch;

  function handleClose() {
    closeDispatch();
    window.setTimeout(() => {
      setUnitId("");
      setPriority(incident ? SEVERITY_TO_PRIORITY[incident.severity] : "High");
      setNotes("");
      setDone(false);
      setDispatching(false);
    }, 250);
  }

  function submit() {
    if (!incident || !unit || dispatching) return;
    setDispatching(true);
    window.setTimeout(() => {
      dispatchUnit(incident.id, unit.id, priority, notes.trim());
      setDispatching(false);
      setDone(true);
    }, 400);
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      eyebrow="Response"
      title="Dispatch Response"
      icon={<Truck size={17} />}
      footer={
        !done ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-fg-dim">
              {incident ? incident.location : ""}
            </span>
            <button
              onClick={submit}
              disabled={!canDispatch || dispatching}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[12px] font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={13} /> {dispatching ? "Dispatching…" : "Dispatch Unit"}
            </button>
          </div>
        ) : (
          <button
            onClick={handleClose}
            className="w-full rounded-lg border border-white/12 py-2 text-[12px] font-medium text-fg-muted transition-colors hover:bg-white/5 hover:text-fg"
          >
            Close
          </button>
        )
      }
    >
      {!incident ? null : done ? (
        <div className="flex flex-col items-center py-8 text-center">
          <span className="mb-4 grid h-14 w-14 place-items-center rounded-full border border-sev-low/40 bg-sev-low/10 text-sev-low">
            <CheckCircle2 size={28} />
          </span>
          <p className="text-sm font-semibold text-fg">Unit dispatched</p>
          <p className="mt-1 max-w-xs text-[12px] text-fg-muted">
            {unit?.label} is now assigned to {incident.location}. Estimated
            arrival ~{unit?.etaMinutes} min (demo estimate, not live routing).
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
            <span className={cn("eyebrow", SEVERITY[incident.severity].text)}>
              {SEVERITY[incident.severity].label} incident
            </span>
            <p className="mt-1 text-[13px] font-semibold text-fg">{incident.location}</p>
            <p className="text-[11px] text-fg-muted">{incident.title}</p>
          </div>

          <div>
            <label className="eyebrow mb-2 block">Response Unit</label>
            <select
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-fg focus:border-accent/50 focus:outline-none"
            >
              <option value="" disabled>
                Select unit…
              </option>
              {RESPONSE_UNITS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label} · {u.base}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="eyebrow mb-2">Priority</p>
            <div className="grid grid-cols-4 gap-1.5">
              {PRIORITY_LEVELS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={cn(
                    "rounded-lg border py-2 text-[11px] font-semibold transition-colors",
                    priority === p
                      ? "border-accent/50 bg-accent/10 text-accent"
                      : "border-white/10 text-fg-muted hover:border-white/20",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {unit && (
            <div className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-[12px]">
              <span className="text-fg-dim">ETA (estimated)</span>
              <span className="numeric font-semibold text-fg">~{unit.etaMinutes} min</span>
            </div>
          )}

          <div>
            <label className="eyebrow mb-2 block">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Instructions for the responding unit…"
              className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-fg placeholder:text-fg-dim focus:border-accent/50 focus:outline-none"
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
