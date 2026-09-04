"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Info, MapPin, ShieldAlert, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { WhatIfPanel } from "@/components/simulation/WhatIfPanel";
import { LiveNumber } from "@/components/ui/LiveNumber";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { DEFAULT_LOCATION_ID, LOCATIONS } from "@/data/locations";
import { REVEAL_VIEWPORT, fadeUp } from "@/lib/motion";
import { SEVERITY, cn } from "@/lib/utils";
import { getRiskZones } from "@/services/risk";
import type { LocationProfile } from "@/types";

const R = 52;
const CIRC = 2 * Math.PI * R;

export function RiskExplorer() {
  // Initialized from the local fixture so first paint is unchanged; getRiskZones() (real
  // backend, with an automatic demo fallback — see services/risk.ts) then swaps it in once
  // resolved, the same pattern ThreatMap uses for /api/threats.
  const [zones, setZones] = useState<LocationProfile[]>(LOCATIONS);
  const [id, setId] = useState(DEFAULT_LOCATION_ID);
  const [factorId, setFactorId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRiskZones().then((fetched) => {
      if (!cancelled && fetched.length > 0) setZones(fetched);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loc = zones.find((z) => z.id === id) ?? zones[0];
  const sev = SEVERITY[loc.risk.band];
  const dash = CIRC * (1 - loc.risk.value / 100);

  const activeFactor =
    loc.factors.find((f) => f.id === factorId) ?? loc.factors[0];
  // Best-effort: pair the chosen factor with a matching driver explanation.
  const factorDriver =
    loc.drivers.find((d) =>
      d.label.toLowerCase().includes(activeFactor.label.toLowerCase().split(" ")[0]),
    ) ?? loc.drivers[0];

  return (
    <Section id="prediction" className="border-t border-white/5">
      <SectionHeader
        eyebrow="AI Prediction · Explainable"
        title={
          <>
            Understand the danger — not just a{" "}
            <span className="text-accent">number</span>.
          </>
        }
        subtitle="Switch between monitored locations and watch the model recompute. Every score is broken down into the factors and drivers behind it."
      />

      {/* Location switcher */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={REVEAL_VIEWPORT}
        className="mt-8 flex flex-wrap gap-2"
      >
        {zones.map((l) => {
          const active = l.id === id;
          const s = SEVERITY[l.risk.band];
          return (
            <button
              key={l.id}
              onClick={() => setId(l.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] font-medium transition-colors",
                active
                  ? "border-white/25 bg-white/[0.06] text-fg"
                  : "border-white/10 bg-white/[0.02] text-fg-muted hover:border-white/20",
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", s.dot)} />
              {l.name}
            </button>
          );
        })}
      </motion.div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Risk dial */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 lg:col-span-4">
          <div className="flex items-center gap-2 text-fg-muted">
            <MapPin size={14} className="text-accent" />
            <span className="text-[12px]">{loc.sector}</span>
          </div>
          <div className="mt-4 flex items-center gap-5">
            <div className="relative h-[132px] w-[132px] shrink-0">
              <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90">
                <circle cx="66" cy="66" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
                <motion.circle
                  cx="66"
                  cy="66"
                  r={R}
                  fill="none"
                  stroke={sev.hex}
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  initial={{ strokeDashoffset: CIRC }}
                  animate={{ strokeDashoffset: dash }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  style={{ filter: `drop-shadow(0 0 6px ${sev.hex}66)` }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <LiveNumber
                  value={loc.risk.value}
                  suffix="%"
                  className="numeric text-[28px] font-semibold text-fg"
                />
                <span
                  className={cn(
                    "mt-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]",
                    sev.bgSoft,
                    sev.text,
                    loc.risk.band === "critical" && "crit-pulse",
                  )}
                >
                  {sev.label}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <p className="eyebrow mb-1">6-Hour Trend</p>
                <span className={cn("inline-flex items-center gap-1 text-sm font-semibold", sev.text)}>
                  <TrendingUp size={14} />
                  <span className="numeric">{loc.risk.deltaLabel}</span>
                </span>
              </div>
              <div>
                <p className="eyebrow mb-1">Confidence</p>
                <span className="numeric text-sm font-semibold text-fg">
                  {loc.risk.confidence}%
                </span>
              </div>
              <div>
                <p className="eyebrow mb-1">Population Exposure</p>
                <span className="numeric text-sm font-semibold text-fg">
                  {loc.impact.populationExposure.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Factors (interactive) */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 lg:col-span-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="eyebrow">Contributing Factors</p>
            <span className="text-[9px] text-fg-dim">tap to inspect</span>
          </div>
          <ul className="space-y-2">
            {loc.factors.map((f) => {
              const s = SEVERITY[f.severity];
              const on = f.id === activeFactor.id;
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => setFactorId(f.id)}
                    className={cn(
                      "w-full rounded-lg px-2 py-1.5 text-left transition-colors",
                      on ? "bg-white/[0.05]" : "hover:bg-white/[0.02]",
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className={on ? "font-medium text-fg" : "text-fg-muted"}>
                        {f.label}
                      </span>
                      <span className="numeric font-semibold text-fg">
                        {f.weight}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                      <motion.div
                        className={cn("h-full rounded-full", s.dot)}
                        animate={{ width: `${f.weight}%` }}
                        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                        style={{ boxShadow: on ? `0 0 8px ${s.hex}aa` : "none" }}
                      />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Selected-factor callout */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFactor.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "mt-3 rounded-lg border p-2.5",
                SEVERITY[activeFactor.severity].border,
                SEVERITY[activeFactor.severity].bgSoft,
              )}
            >
              <p className="text-[11px] leading-snug text-fg">
                <span className="font-semibold">↑ {activeFactor.label}</span>{" "}
                <span className="text-fg-muted">
                  raises the simulated risk — it contributes{" "}
                  <span className="numeric font-semibold text-fg">
                    {activeFactor.weight}%
                  </span>{" "}
                  of the current score.
                </span>
              </p>
              <p className="mt-1 text-[10px] leading-snug text-fg-muted">
                {factorDriver.detail}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Explainable AI */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 lg:col-span-4">
          <div className="mb-4 flex items-center gap-2">
            <ShieldAlert size={15} className={sev.text} />
            <p className="eyebrow">Why — Primary Drivers</p>
          </div>

          {/* Contribution ribbon */}
          <div className="mb-4 flex h-2.5 overflow-hidden rounded-full">
            {loc.drivers.map((d) => (
              <motion.div
                key={d.id}
                className={SEVERITY[d.severity].dot}
                initial={{ width: 0 }}
                animate={{ width: `${d.contribution}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                title={`${d.label} · ${d.contribution}%`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.ul
              key={id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-2.5"
            >
              {loc.drivers.map((d, i) => {
                const s = SEVERITY[d.severity];
                return (
                  <motion.li
                    key={d.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="flex gap-2.5"
                  >
                    <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", s.dot)} />
                    <div>
                      <p className="text-[12px] font-medium text-fg">{d.label}</p>
                      <p className="text-[11px] leading-snug text-fg-muted">{d.detail}</p>
                    </div>
                  </motion.li>
                );
              })}
            </motion.ul>
          </AnimatePresence>

          <p className="mt-4 flex items-center gap-1.5 text-[10px] text-fg-dim">
            <Info size={11} /> Demonstration model output · not live inference
          </p>
        </div>
      </div>

      {/* What-if */}
      <div className="mt-4">
        <WhatIfPanel locationId={id} />
      </div>
    </Section>
  );
}
