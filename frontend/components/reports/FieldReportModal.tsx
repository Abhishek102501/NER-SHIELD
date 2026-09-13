"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, RadioTower, Send } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { REPORT_LOCATIONS } from "@/data/report-locations";
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
  const { activeModal, closeModal, createIncident, permissions } = useCommand();
  const open = activeModal === "report";

  const [severity, setSeverity] = useState<Severity>("high");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [locationLabel, setLocationLabel] = useState("");
  const [affectedArea, setAffectedArea] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const selectedLocation = REPORT_LOCATIONS.find((l) => l.label === locationLabel);
  const canSubmit = !!selectedLocation && notes.trim().length > 4 && permissions.createIncident;

  const submit = () => {
    if (!canSubmit || !selectedLocation || submitting) return;
    setSubmitting(true);
    // Real state mutation — no network round trip to fake here, so the only
    // thing worth a brief delay is preventing a double-click double-submit.
    window.setTimeout(() => {
      const incident = createIncident({
        severity,
        category,
        location: selectedLocation.label,
        lngLat: selectedLocation.lngLat,
        description: notes.trim(),
        affectedArea: affectedArea.trim() || undefined,
        source: "Ops Command · Field Report",
      });
      setCreatedId(incident.id);
      setSubmitting(false);
    }, 400);
  };

  const resetForm = () => {
    setCreatedId(null);
    setSeverity("high");
    setCategory(CATEGORIES[0]);
    setLocationLabel("");
    setAffectedArea("");
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
        !createdId ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-fg-dim">
              {permissions.createIncident
                ? "Adds a real incident to the feed and map"
                : "Reporting is disabled for this role"}
            </span>
            <button
              onClick={submit}
              disabled={!canSubmit || submitting}
              className="flex items-center gap-1.5 rounded-lg bg-sev-critical px-4 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={13} /> {submitting ? "Submitting…" : "Submit Incident"}
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
        {createdId ? (
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
            <p className="text-sm font-semibold text-fg">Incident created</p>
            <p className="mt-1 max-w-xs text-[12px] text-fg-muted">
              <span className="numeric text-fg">{createdId}</span> is now live
              in Recent Incidents and on the GIS map.
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
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
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

            {/* Location — a real, mappable place, not free text, so the
                incident this creates always has a genuine map position. */}
            <div>
              <label className="eyebrow mb-2 block">Location</label>
              <select
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-fg focus:border-accent/50 focus:outline-none"
              >
                <option value="" disabled>
                  Select a location…
                </option>
                {REPORT_LOCATIONS.map((loc) => (
                  <option key={loc.label} value={loc.label}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Affected area */}
            <div>
              <label className="eyebrow mb-2 block">Affected Area (optional)</label>
              <input
                value={affectedArea}
                onChange={(e) => setAffectedArea(e.target.value)}
                placeholder="e.g. 400m stretch, 2 villages"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-fg placeholder:text-fg-dim focus:border-accent/50 focus:outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="eyebrow mb-2 block">Description</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Describe what you observed on the ground…"
                className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-fg placeholder:text-fg-dim focus:border-accent/50 focus:outline-none"
              />
            </div>

            <p className="text-[10px] text-fg-dim">
              Source: Ops Command · Field Report. Attachments aren&apos;t
              supported yet — there&apos;s no file storage wired up in this
              demo.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
