"use client";

import { motion } from "framer-motion";
import { SEVERITY, cn } from "@/lib/utils";
import type { HeroHotspot } from "@/data/hero-feed";

interface RiskHotspotProps {
  hotspot: HeroHotspot;
  /** Position in the same 0–100 projector space as NeMapVisual, i.e. percentages. */
  x: number;
  y: number;
  delay?: number;
}

/** A floating risk-label tooltip pinned over the hero's NE-India map, at the
 * hotspot's real projected coordinates (see data/hero-feed.ts + data/ne-boundary.ts). */
export function RiskHotspot({ hotspot, x, y, delay = 0 }: RiskHotspotProps) {
  const sev = SEVERITY[hotspot.severity];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div className="relative">
        <span
          className={cn("absolute inset-0 -m-2 rounded-full blur-md", sev.bgSoft)}
          style={{ background: `${sev.hex}33` }}
        />
        <span className="relative flex h-2.5 w-2.5">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
            style={{ backgroundColor: sev.hex }}
          />
          <span
            className="relative h-2.5 w-2.5 rounded-full ring-2 ring-ink"
            style={{ backgroundColor: sev.hex }}
          />
        </span>
      </div>
      <div className="glass-float absolute left-1/2 top-full mt-2 w-max -translate-x-1/2 rounded-lg px-2.5 py-1.5">
        <p className={cn("text-[10px] font-bold uppercase tracking-wider", sev.text)}>
          {hotspot.label}
        </p>
        <p className="text-[10px] text-fg-muted">{hotspot.detail}</p>
      </div>
    </motion.div>
  );
}
