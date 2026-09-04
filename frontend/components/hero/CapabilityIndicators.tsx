"use client";

import { motion } from "framer-motion";
import { Radio, Satellite, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { EASE_OUT } from "@/lib/motion";

const ITEMS = [
  { icon: Radio, label: "Live data integration", live: true },
  { icon: Satellite, label: "Satellite monitoring", live: false },
  { icon: SlidersHorizontal, label: "AI risk modeling", live: false },
  { icon: ShieldCheck, label: "Safer communities", live: false },
];

export function CapabilityIndicators() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.35 }}
      className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3"
    >
      {ITEMS.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-1.5 text-[12px] text-fg-dim"
        >
          {item.live ? (
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sev-low/60" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-sev-low" />
            </span>
          ) : (
            <item.icon size={13} className="shrink-0 text-fg-dim" />
          )}
          {item.label}
        </span>
      ))}
    </motion.div>
  );
}
