"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MapPin, Radio, User } from "lucide-react";
import { useCommand } from "@/lib/command-context";
import { SEVERITY, cn } from "@/lib/utils";
import { AlertItem } from "./AlertItem";

export function IncidentList() {
  const { incidents, selectedIncidentId, selectIncident, selectedIncident } = useCommand();

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
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={cn(
                    "eyebrow",
                    SEVERITY[selectedIncident.severity].text,
                  )}
                >
                  Incident · {selectedIncident.id.replace("inc-", "#")}
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
              </dl>
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
