"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Severity } from "@/types";
import { SEVERITY, cn } from "@/lib/utils";

const SEV_ORDER: Severity[] = ["critical", "high", "moderate", "low"];

export function MapLegend() {
  // Collapsed by default — on a short viewport the expanded list has no
  // business claiming most of the map's vertical space. It's one click away.
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 z-10 max-w-[calc(100%-1.5rem)]">
      <div className="map-card w-48 overflow-hidden rounded-lg">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2"
        >
          <span className="map-eyebrow">Risk Level</span>
          <ChevronDown
            size={13}
            className={cn(
              "text-slate-400 transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
        <motion.div
          initial={false}
          animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
          transition={{ duration: 0.24, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          {/* Fixed cap, not viewport-relative — on a short window 40vh could
              still swallow most of the map. */}
          <div className="max-h-64 space-y-3 overflow-y-auto px-3 pb-3">
            <div>
              <p className="map-eyebrow mb-1.5 text-accent/70">Risk Zones &amp; Incidents</p>
              <div className="space-y-1.5">
                {SEV_ORDER.map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 rounded-full", SEVERITY[s].dot)} />
                    <span className="text-[11px] font-medium text-slate-600">
                      {SEVERITY[s].label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-900/8" />

            <div>
              <p className="map-eyebrow mb-1.5 text-accent/70">AI Landslide Detections</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-4 rounded-sm border border-dashed border-[#f97316]"
                    style={{ backgroundColor: "rgba(249,115,22,0.22)" }}
                  />
                  <span className="text-[11px] text-slate-600">Detected zone (color = severity)</span>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-900/8" />

            <div>
              <p className="map-eyebrow mb-1.5 text-accent/70">Natural</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="h-0.5 w-3 rounded-full bg-[#3b82f6]" />
                  <span className="text-[11px] text-slate-600">River / waterway</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-0.5 w-3 rounded-full bg-[#0ea5e9]" style={{ backgroundImage: "repeating-linear-gradient(90deg,#0ea5e9 0 3px,transparent 3px 6px)" }} />
                  <span className="text-[11px] text-slate-600">Evacuation route</span>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-900/8" />

            <div>
              <p className="map-eyebrow mb-1.5 text-accent/70">Infrastructure</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="grid h-2.5 w-2.5 place-items-center rounded-full border-2 border-[#2563eb] bg-white" />
                  <span className="text-[11px] text-slate-600">Hospital</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="grid h-2.5 w-2.5 place-items-center rounded-full border-2 border-[#7c3aed] bg-white" />
                  <span className="text-[11px] text-slate-600">Bridge</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="grid h-2.5 w-2.5 place-items-center rounded-full border-2 border-[#0d9488] bg-white" />
                  <span className="text-[11px] text-slate-600">Relief shelter</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="grid h-2.5 w-2.5 place-items-center rounded-full border border-white bg-sev-high" />
                  <span className="text-[11px] text-slate-600">Incident cluster</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_6px_1px_rgba(34,197,94,0.5)]" />
                  <span className="text-[11px] text-slate-600">Search result</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
