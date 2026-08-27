"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Info, MapPin, ShieldAlert, TrendingUp } from "lucide-react";
import { useState } from "react";
import { WhatIfPanel } from "@/components/simulation/WhatIfPanel";
import { LiveNumber } from "@/components/ui/LiveNumber";
import { Section } from "@/components/ui/Section";
import { DEFAULT_LOCATION_ID, LOCATIONS, getLocation } from "@/data/locations";
import { REVEAL_VIEWPORT, fadeUp } from "@/lib/motion";
import { SEVERITY, cn } from "@/lib/utils";

const R = 52;
const CIRC = 2 * Math.PI * R;

const FACTOR_GRADIENTS: Record<string, string> = {
  critical: "linear-gradient(90deg, #ee0000 0%, #eb367f 100%)",
  high: "linear-gradient(90deg, #f97316 0%, #f5a623 100%)",
  moderate: "linear-gradient(90deg, #f5a623 0%, #50e3c2 100%)",
  low: "linear-gradient(90deg, #0070f3 0%, #50e3c2 100%)",
};

export function RiskExplorer() {
  const [id, setId] = useState(DEFAULT_LOCATION_ID);
  const loc = getLocation(id);
  const sev = SEVERITY[loc.risk.band];
  const dash = CIRC * (1 - loc.risk.value / 100);

  return (
    <Section id="prediction" className="bg-canvas border-b border-hairline py-20">
      {/* Section Header */}
      <div className="max-w-3xl mb-8">
        <span className="caption-mono text-cyan block mb-2 font-medium">EXPLAINABLE RISK ENGINE.</span>
        <h2 className="display-lg text-ink">
          Understand the danger — not just a score.
        </h2>
        <p className="body-lg text-body mt-4">
          Switch between monitored locations in the North-East region to inspect factor weights, environmental drivers, and real-time confidence scores.
        </p>
      </div>

      {/* Tab pill row with vibrant gradients */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={REVEAL_VIEWPORT}
        className="flex flex-wrap gap-2.5 mb-8"
      >
        {LOCATIONS.map((l) => {
          const active = l.id === id;
          return (
            <button
              key={l.id}
              onClick={() => setId(l.id)}
              className={cn(
                "rounded-full px-4 py-1.5 body-sm transition-all cursor-pointer border shadow-sm",
                active
                  ? "bg-primary text-on-primary border-primary font-semibold shadow-sm"
                  : "bg-canvas-soft-2 text-body border-hairline hover:border-hairline-strong hover:text-ink"
              )}
            >
              {l.name}
            </button>
          );
        })}
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Risk dial card */}
        <div className="card-marketing p-6 lg:col-span-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-body border-b border-hairline pb-3">
            <MapPin size={15} className="text-cyan" />
            <span className="body-sm font-medium">{loc.sector}</span>
          </div>

          <div className="my-6 flex items-center gap-6">
            <div className="relative h-[132px] w-[132px] shrink-0">
              <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90">
                <circle cx="66" cy="66" r={R} fill="none" stroke="var(--hairline)" strokeWidth="8" />
                <motion.circle
                  cx="66"
                  cy="66"
                  r={R}
                  fill="none"
                  stroke={sev.hex}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  initial={{ strokeDashoffset: CIRC }}
                  animate={{ strokeDashoffset: dash }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <LiveNumber
                  value={loc.risk.value}
                  suffix="%"
                  className="numeric text-3xl font-semibold text-ink"
                />
                <span className="caption-mono text-[10px] text-body mt-1 uppercase font-semibold">
                  {sev.label}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <p className="caption-mono text-mute mb-0.5">6-HOUR TREND</p>
                <span className={cn("inline-flex items-center gap-1 body-sm font-semibold", sev.text)}>
                  <TrendingUp size={14} />
                  <span className="numeric">{loc.risk.deltaLabel}</span>
                </span>
              </div>
              <div>
                <p className="caption-mono text-mute mb-0.5">MODEL CONFIDENCE</p>
                <span className="numeric body-md font-semibold text-ink">
                  {loc.risk.confidence}%
                </span>
              </div>
              <div>
                <p className="caption-mono text-mute mb-0.5">POPULATION EXPOSURE</p>
                <span className="numeric body-md font-semibold text-ink">
                  {loc.impact.populationExposure.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Factors card */}
        <div className="card-marketing p-6 lg:col-span-4 flex flex-col justify-between">
          <div>
            <p className="caption-mono text-mute mb-4">CONTRIBUTING FACTORS</p>
            <ul className="space-y-4">
              {loc.factors.map((f) => {
                const grad = FACTOR_GRADIENTS[f.severity] || "linear-gradient(90deg, #0070f3, #50e3c2)";
                return (
                  <li key={f.id}>
                    <div className="mb-1.5 flex items-center justify-between body-sm">
                      <span className="text-body font-medium">{f.label}</span>
                      <span className="numeric font-semibold text-ink">{f.weight}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-canvas-soft-2 border border-hairline">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: grad }}
                        animate={{ width: `${f.weight}%` }}
                        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Primary drivers card */}
        <div className="card-marketing p-6 lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center gap-2 border-b border-hairline pb-3">
              <ShieldAlert size={16} className="text-cyan" />
              <p className="caption-mono text-ink font-semibold">PRIMARY DRIVERS</p>
            </div>

            <AnimatePresence mode="wait">
              <motion.ul
                key={id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-3"
              >
                {loc.drivers.map((d, i) => (
                  <motion.li
                    key={d.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="flex gap-3"
                  >
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gradient-to-r from-cyan to-blue-500" />
                    <div>
                      <p className="body-sm font-semibold text-ink">{d.label}</p>
                      <p className="body-sm text-body leading-snug">{d.detail}</p>
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
            </AnimatePresence>
          </div>

          <p className="mt-4 flex items-center gap-1.5 caption-mono text-[10px] text-mute border-t border-hairline pt-3">
            <Info size={12} className="text-cyan" /> AI INFERENCE ENGINE · REAL-TIME HAZARD BRAIN
          </p>
        </div>
      </div>

      {/* Simulation widget */}
      <div className="mt-6">
        <WhatIfPanel locationId={id} />
      </div>
    </Section>
  );
}

