"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Severity } from "@/types";
import { SEVERITY, cn } from "@/lib/utils";

const SEV_ORDER: Severity[] = ["critical", "high", "moderate", "low"];

export function MapLegend() {
  const [open, setOpen] = useState(true);

  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 z-10">
      <div className="glass-float w-44 overflow-hidden rounded-lg">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2"
        >
          <span className="eyebrow">Legend</span>
          <ChevronDown
            size={13}
            className={cn(
              "text-fg-dim transition-transform",
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
          <div className="space-y-1.5 px-3 pb-3">
            {SEV_ORDER.map((s) => (
              <div key={s} className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", SEVERITY[s].dot)} />
                <span className="text-[11px] text-fg-muted">
                  {SEVERITY[s].label} risk
                </span>
              </div>
            ))}
            <div className="my-1.5 h-px bg-white/8" />
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-accent" />
              <span className="text-[11px] text-fg-muted">Sensor / asset</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
