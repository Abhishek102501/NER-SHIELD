"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCheck, MapPin, Radio, RadioTower, User } from "lucide-react";
import { useCommand } from "@/lib/command-context";
import { SEVERITY, cn } from "@/lib/utils";
import { AlertItem } from "./AlertItem";

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  acknowledged: "Acknowledged",
  dispatched: "Dispatched",
  resolved: "Resolved",
};

export function IncidentList() {
  const {
    incidents,
    selectedIncidentId,
    selectIncident,
    selectedIncident,
    acknowledgeIncident,
    updateIncidentStatus,
    openDispatch,
    permissions,
  } = useCommand();

  return (
    <div className="flex flex-col gap-2">
      {incidents.map((incident, i) => (
        <AlertItem
          key={incident.id}
          incident={incident}
          index={i}
          selected={incident.id === selectedIncidentId}
          onSelect={() =>
            selectIncident(
              incident.id === selectedIncidentId ? null : incident.id,
            )
          }
        />
      ))}

      {/* Inline incident detail state */}
      <AnimatePresence initial={false}>
        {selectedIncident && (
          <motion.div
            key={selectedIncident.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                "mt-1 rounded-lg border bg-black/30 p-3",
                SEVERITY[selectedIncident.severity].border,
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "eyebrow",
                    SEVERITY[selectedIncident.severity].text,
                  )}
                >
                  Incident · {selectedIncident.id.replace("inc-", "#")}
                </span>
                <span className="rounded-full bg-white/8 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-fg-muted">
                  {STATUS_LABEL[selectedIncident.status] ?? selectedIncident.status}
                </span>
              </div>
              <p className="text-[12px] leading-relaxed text-fg-muted">
                {selectedIncident.summary}
              </p>
              <dl className="mt-3 grid grid-cols-1 gap-1.5 text-[11px]">
                <div className="flex items-center gap-2 text-fg-muted">
                  <MapPin size={12} className="text-fg-dim" />
                  <span className="text-fg">{selectedIncident.location}</span>
                </div>
                <div className="flex items-center gap-2 text-fg-muted">
                  <Radio size={12} className="text-fg-dim" />
                  <span>{selectedIncident.category}</span>
                </div>
                <div className="flex items-center gap-2 text-fg-muted">
                  <User size={12} className="text-fg-dim" />
                  <span>{selectedIncident.reportedBy}</span>
                </div>
                {selectedIncident.acknowledgedBy && (
                  <div className="flex items-center gap-2 text-fg-muted">
                    <CheckCheck size={12} className="text-sev-low" />
                    <span>Acknowledged by {selectedIncident.acknowledgedBy}</span>
                  </div>
                )}
                {selectedIncident.dispatch && (
                  <div className="flex items-center gap-2 text-fg-muted">
                    <RadioTower size={12} className="text-accent" />
                    <span>
                      {selectedIncident.dispatch.unitLabel} · ETA{" "}
                      {selectedIncident.dispatch.eta}
                    </span>
                  </div>
                )}
              </dl>

              {/* Actions — every one of these is a real state mutation via
                  useCommand(), not a decorative button. */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => acknowledgeIncident(selectedIncident.id)}
                  disabled={!permissions.acknowledgeAlert || selectedIncident.status !== "new"}
                  className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-fg-muted transition-colors hover:bg-white/5 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
                  title={selectedIncident.status !== "new" ? "Already acknowledged" : undefined}
                >
                  Acknowledge
                </button>
                <button
                  onClick={() => openDispatch(selectedIncident.id)}
                  disabled={!permissions.dispatch}
                  className="rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Dispatch
                </button>
                {selectedIncident.status !== "resolved" && (
                  <button
                    onClick={() => updateIncidentStatus(selectedIncident.id, "resolved")}
                    disabled={!permissions.updateIncident}
                    className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-fg-muted transition-colors hover:bg-white/5 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>

              <button
                onClick={() => selectIncident(null)}
                className="mt-3 text-[11px] font-medium text-accent hover:text-accent-2"
              >
                Close detail
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
