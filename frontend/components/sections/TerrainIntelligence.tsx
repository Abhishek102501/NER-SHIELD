"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  CloudRain,
  Droplets,
  Mountain,
  TriangleRight,
  Radio,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Section } from "@/components/ui/Section";
import { LOCATIONS } from "@/data/locations";
import { REVEAL_VIEWPORT, fadeUp, staggerParent } from "@/lib/motion";

const m = LOCATIONS[0].metrics;

interface Signal {
  id: string;
  icon: LucideIcon;
  label: string;
  value: number;
  unit: string;
  decimals?: number;
  meter: number;
  gradient: string;
  caption: string;
  detail: string;
}

const SIGNALS: Signal[] = [
  {
    id: "rainfall",
    icon: CloudRain,
    label: "Rainfall Intensity",
    value: m.rainfall72h,
    unit: "mm / 72h",
    meter: 92,
    gradient: "linear-gradient(90deg, #ef4444 0%, #f97316 100%)",
    caption: "2.4× seasonal alert threshold.",
    detail: "Cloudburst detection over East Khasi Hills & Cherrapunji radar stations.",
  },
  {
    id: "soil",
    icon: Droplets,
    label: "Soil Moisture Saturation",
    value: m.soilMoisture,
    unit: "%",
    meter: m.soilMoisture,
    gradient: "linear-gradient(90deg, #f97316 0%, #eab308 100%)",
    caption: "Past the 70% failure threshold.",
    detail: "Pore-water pressure reduces soil shear strength along steep slopes.",
  },
  {
    id: "slope",
    icon: TriangleRight,
    label: "Slope Gradient Index",
    value: m.slope,
    unit: "° steepness",
    meter: (m.slope / 60) * 100,
    gradient: "linear-gradient(90deg, #22d3ee 0%, #38bdf8 100%)",
    caption: "Cut-slope steepness along NH-27.",
    detail: "Geotechnical sensors indicate structural micro-displacement.",
  },
  {
    id: "elevation",
    icon: Mountain,
    label: "Dem 3D Elevation Model",
    value: m.elevation,
    unit: "meters MSL",
    meter: 64,
    gradient: "linear-gradient(90deg, #38bdf8 0%, #22d3ee 100%)",
    caption: "High-precision 10m Cartosat DEM.",
    detail: "SAR interferometry mapping topographical shifts in real-time.",
  },
];

export function TerrainIntelligence() {
  const [activeSignal, setActiveSignal] = useState<string>("rainfall");

  return (
    <Section id="terrain" className="bg-white/5 border-b border-hairline py-20">
      {/* Header following DESIGN.md specification */}
      <div className="max-w-3xl mb-12">
        <span className="caption-mono text-accent block mb-2 font-medium">MULTI-SENSOR TERRAIN BRAIN.</span>
        <h2 className="display-lg text-fg">
          Four live signals, fused into one risk brain.
        </h2>
        <p className="body-lg text-fg-muted mt-4">
          NER-SHIELD continuously ingests environmental and terrain data across the North-Eastern region. Each signal is weighted by the model to pinpoint ground failure risks.
        </p>
      </div>

      {/* Metric Cards in card-marketing specification */}
      <motion.div
        variants={staggerParent}
        initial="hidden"
        whileInView="show"
        viewport={REVEAL_VIEWPORT}
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {SIGNALS.map((s) => {
          const isSelected = activeSignal === s.id;
          return (
            <motion.div
              key={s.id}
              variants={fadeUp}
              onClick={() => setActiveSignal(s.id)}
              className={`card-marketing cursor-pointer p-6 transition-all ${
                isSelected
                  ? "ring-2 ring-accent border-transparent bg-white/[0.02] shadow-[0_8px_32px_rgba(34,211,238,0.18)]"
                  : "hover:border-white/15"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/8 text-fg border border-hairline shadow-sm">
                  <s.icon size={20} className="text-accent" />
                </span>
                {isSelected && (
                  <span className="caption-mono text-[10px] text-fg font-semibold flex items-center gap-1 bg-accent/15 px-2 py-0.5 rounded-full border border-accent/30">
                    <CheckCircle2 size={12} className="text-accent" /> SELECTED
                  </span>
                )}
              </div>

              <p className="caption-mono text-fg-dim mt-4">{s.label}</p>

              <div className="mt-2 flex items-baseline gap-1.5">
                <AnimatedNumber
                  value={s.value}
                  decimals={s.decimals ?? 0}
                  className="numeric text-3xl font-semibold text-fg"
                />
                <span className="body-sm text-fg-muted">{s.unit}</span>
              </div>

              {/* Gradient Meter bar */}
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8 border border-hairline">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: s.gradient }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${Math.min(100, s.meter)}%` }}
                  viewport={REVEAL_VIEWPORT}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>

              <p className="mt-3 body-sm text-fg-muted">{s.caption}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Selected telemetry node details */}
      {SIGNALS.find((s) => s.id === activeSignal) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 card-marketing p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-l-4 border-l-accent"
        >
          <div className="flex items-center gap-3">
            <Radio size={20} className="text-accent animate-pulse shrink-0" />
            <div>
              <h4 className="body-md font-semibold text-fg">
                Active Node: {SIGNALS.find((s) => s.id === activeSignal)?.label}
              </h4>
              <p className="body-sm text-fg-muted">
                {SIGNALS.find((s) => s.id === activeSignal)?.detail}
              </p>
            </div>
          </div>
          <span className="caption-mono text-[11px] text-fg bg-gradient-to-r from-accent/20 to-blue-500/20 px-3.5 py-1.5 rounded-full border border-accent/30 shrink-0 font-semibold">
            TELEMETRY STREAM: 100% NOMINAL
          </span>
        </motion.div>
      )}
    </Section>
  );
}

