"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Users, Waypoints, X } from "lucide-react";
import type { RiskZone } from "@/types";
import { SEVERITY, cn } from "@/lib/utils";

export function ZoneDetailPanel({
  zone,
  onClose,
}: {
  zone: RiskZone | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {zone && (
        <motion.div
          key={zone.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="glass-float pointer-events-auto absolute right-3 top-3 z-20 w-[290px] max-w-[calc(100%-1.5rem)] overflow-hidden rounded-xl"
        >
          <span
            className={cn("absolute inset-x-0 top-0 h-0.5", SEVERITY[zone.band].dot)}
          />
          <div className="flex items-start justify-between gap-2 px-4 pb-3 pt-4">
            <div>
              <span
                className={cn(
                  "eyebrow",
                  SEVERITY[zone.band].text,
                )}
              >
                {SEVERITY[zone.band].label} Risk Zone
              </span>
              <h4 className="mt-1 text-sm font-semibold text-fg">{zone.name}</h4>
            </div>
            <button
              onClick={onClose}
              aria-label="Close zone detail"
              className="grid h-7 w-7 place-items-center rounded-md border border-white/10 text-fg-muted transition-colors hover:bg-white/5 hover:text-fg"
            >
              <X size={14} />
            </button>
          </div>

          <div className="px-4 pb-4">
            <div className="flex items-end gap-2">
              <span className={cn("numeric text-3xl font-semibold", SEVERITY[zone.band].text)}>
                {zone.risk}%
              </span>
              <span className="mb-1 text-[11px] text-fg-dim">risk index</span>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <Stat label="Rainfall" value={`${zone.rainfall} mm`} />
              <Stat label="Roads at risk" value={`${zone.roadsAtRisk}`} />
              <Stat
                label="Population"
                value={zone.population.toLocaleString()}
                icon={<Users size={11} />}
              />
              <Stat
                label="Zone ID"
                value={zone.id.slice(0, 10)}
                icon={<Waypoints size={11} />}
              />
            </dl>

            <div className={cn("mt-3 rounded-lg border p-2.5", SEVERITY[zone.band].border, SEVERITY[zone.band].bgSoft)}>
              <p className="eyebrow mb-1">Recommended Action</p>
              <p className="text-[12px] leading-snug text-fg">
                {zone.recommendedAction}
              </p>
            </div>

            <button className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/[0.04] py-2 text-[11px] font-semibold text-fg-muted transition-colors hover:bg-white/[0.08] hover:text-fg">
              Open in command center
              <ArrowUpRight size={13} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-2.5 py-1.5">
      <p className="flex items-center gap-1 text-[9px] uppercase tracking-[0.12em] text-fg-dim">
        {icon}
        {label}
      </p>
      <p className="numeric mt-0.5 font-semibold text-fg">{value}</p>
    </div>
  );
}
