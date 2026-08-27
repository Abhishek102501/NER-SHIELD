"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, RadioTower, Send } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useCommand } from "@/lib/command-context";
import type { Severity } from "@/types";
import { SEVERITY, cn } from "@/lib/utils";

const CATEGORIES = [
  "Landslide",
  "Flood",
  "Road Obstruction",
  "Structural",
  "Other",
];
const SEVERITIES: Severity[] = ["low", "moderate", "high", "critical"];

export function FieldReportModal() {
  const { activeModal, closeModal } = useCommand();
  const open = activeModal === "report";

  const [severity, setSeverity] = useState<Severity>("high");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = location.trim().length > 1;

  const submit = () => {
    if (!canSubmit) return;
    setSubmitted(true);
  };

  const resetForm = () => {
    setSubmitted(false);
    setSeverity("high");
    setCategory(CATEGORIES[0]);
    setLocation("");
    setNotes("");
  };

  const handleClose = () => {
    closeModal();
    window.setTimeout(resetForm, 250);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      variant="drawer"
      eyebrow="Field Operations"
      title="Report Incident"
      icon={<RadioTower size={17} />}
      accent="critical"
      footer={
        !submitted ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-fg-dim">
              Stored locally · mock submission
            </span>
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="flex items-center gap-1.5 rounded-lg bg-sev-critical px-4 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={13} /> Submit Report
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
      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-8 text-center"
          >
            <span className="mb-4 grid h-14 w-14 place-items-center rounded-full border border-sev-low/40 bg-sev-low/10 text-sev-low">
              <CheckCircle2 size={28} />
            </span>
            <p className="text-sm font-semibold text-fg">Report queued</p>
            <p className="mt-1 max-w-xs text-[12px] text-fg-muted">
              Reference{" "}
              <span className="numeric text-fg">FR-0033</span> saved to the local
              queue. Backend dispatch arrives in a later milestone.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            {/* Severity */}
            <div>
              <p className="eyebrow mb-2">Severity</p>
              <div className="grid grid-cols-4 gap-1.5">
                {SEVERITIES.map((s) => {
                  const sev = SEVERITY[s];
                  const active = severity === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setSeverity(s)}
                      className={cn(
                        "rounded-lg border py-2 text-[11px] font-semibold capitalize transition-colors",
                        active
                          ? cn(sev.bgSoft, sev.text, sev.border)
                          : "border-white/10 text-fg-muted hover:border-white/20",
                      )}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category */}
            <div>
              <p className="eyebrow mb-2">Category</p>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
                      category === c
                        ? "border-accent/50 bg-accent/10 text-accent"
                        : "border-white/10 text-fg-muted hover:border-white/20",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="eyebrow mb-2 block">Location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. NH-10 near Rangpo"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-fg placeholder:text-fg-dim focus:border-accent/50 focus:outline-none"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="eyebrow mb-2 block">Observations</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Describe what you observed on the ground…"
                className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-fg placeholder:text-fg-dim focus:border-accent/50 focus:outline-none"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
