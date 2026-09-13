"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Crosshair, Users, X } from "lucide-react";
import { getZoneDetail } from "@/data/risk-zones";
import type { RiskZone, RiskZoneDetail } from "@/types";
import { SEVERITY, cn } from "@/lib/utils";

interface ZoneDetailPanelProps {
  zone: RiskZone | null;
  onClose: () => void;
  /** Focus/center the map (or navigate) on this zone. */
  onFocus?: (detail: RiskZoneDetail) => void;
  focusLabel?: string;
}

export function ZoneDetailPanel({
  zone,
  onClose,
  onFocus,
  focusLabel = "Focus on zone",
}: ZoneDetailPanelProps) {
  const detail = zone ? getZoneDetail(zone.id) : null;
  // Fall back to the raw feature props if a rich record isn't found.
  const d: RiskZoneDetail | null =
    detail ??
    (zone
      ? {
          id: zone.id,
          name: zone.name,
          band: zone.band,
          risk: zone.risk,
          probability: Math.max(0, zone.risk - 3),
          rainfall: zone.rainfall,
          population: zone.population,
          infrastructureAtRisk: `${zone.roadsAtRisk} roads at risk`,
          drivers: [],
          recommendedAction: zone.recommendedAction,
          center: [0, 0],
        }
      : null);

  return (
    <AnimatePresence>
      {d && (
        <motion.div
          key={d.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="map-card pointer-events-auto absolute right-3 top-3 z-20 flex max-h-[calc(100%-1.5rem)] w-[300px] max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-xl"
        >
          <span className={cn("absolute inset-x-0 top-0 h-0.5", SEVERITY[d.band].dot)} />
          <div className="flex items-start justify-between gap-2 px-4 pb-3 pt-4">
            <div>
              <span className="flex items-center gap-2">
                <span className={cn("map-eyebrow", SEVERITY[d.band].text)}>
                  {SEVERITY[d.band].label} Risk Zone
                </span>
                <span className="rounded bg-slate-900/6 px-1 py-0.5 text-[8px] font-bold tracking-widest text-slate-400">
                  DEMO
                </span>
              </span>
              <h4 className="mt-1 text-sm font-semibold text-slate-900">{d.name}</h4>
            </div>
            <button
              onClick={onClose}
              aria-label="Close zone detail"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-slate-900/10 text-slate-400 transition-colors hover:bg-slate-900/5 hover:text-slate-900"
            >
              <X size={14} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            {/* Score + probability */}
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="map-eyebrow mb-0.5">Risk Score</p>
                <span className={cn("numeric text-3xl font-semibold", SEVERITY[d.band].text)}>
                  {d.risk}%
                </span>
              </div>
              <div className="text-right">
                <p className="map-eyebrow mb-0.5">Probability</p>
                <span className="numeric text-xl font-semibold text-slate-900">
                  {d.probability}%
                </span>
              </div>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <Stat label="Rainfall" value={`${d.rainfall} mm`} />
              <Stat
                label="Population"
                value={d.population.toLocaleString()}
                icon={<Users size={11} />}
              />
            </dl>

            {d.drivers.length > 0 && (
              <div className="mt-3">
                <p className="map-eyebrow mb-1.5">Primary Drivers</p>
                <ul className="space-y-1">
                  {d.drivers.map((driver) => (
                    <li key={driver} className="flex gap-2 text-[11px] text-slate-500">
                      <span
                        className={cn(
                          "mt-1.5 h-1 w-1 shrink-0 rounded-full",
                          SEVERITY[d.band].dot,
                        )}
                      />
                      {driver}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-3">
              <p className="map-eyebrow mb-1">Infrastructure at Risk</p>
              <p className="text-[12px] text-slate-800">{d.infrastructureAtRisk}</p>
            </div>

            <div
              className={cn(
                "mt-3 rounded-lg border p-2.5",
                SEVERITY[d.band].border,
                SEVERITY[d.band].bgSoft,
              )}
            >
              <p className="map-eyebrow mb-1">Recommended Action</p>
              <p className="text-[12px] leading-snug text-slate-800">{d.recommendedAction}</p>
            </div>

            {onFocus && (
              <button
                onClick={() => onFocus(d)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900/[0.04] py-2 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-900/[0.08] hover:text-slate-900"
              >
                <Crosshair size={13} />
                {focusLabel}
              </button>
            )}
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
    <div className="rounded-lg bg-slate-900/[0.035] px-2.5 py-1.5">
      <p className="flex items-center gap-1 text-[9px] uppercase tracking-[0.12em] text-slate-400">
        {icon}
        {label}
      </p>
      <p className="numeric mt-0.5 font-semibold text-slate-900">{value}</p>
    </div>
  );
}
