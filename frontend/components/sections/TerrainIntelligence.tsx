"use client";

import { motion } from "framer-motion";
import {
  CloudRain,
  Droplets,
  Mountain,
  TriangleRight,
  type LucideIcon,
} from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
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
  meter: number; // 0–100 fill
  accent: string;
  caption: string;
}

const SIGNALS: Signal[] = [
  {
    id: "rainfall",
    icon: CloudRain,
    label: "Rainfall Intensity",
    value: m.rainfall72h,
    unit: "mm / 72h",
    meter: 92,
    accent: "var(--color-sev-critical)",
    caption: "2.4× the seasonal alert threshold",
  },
  {
    id: "soil",
    icon: Droplets,
    label: "Soil Moisture",
    value: m.soilMoisture,
    unit: "%",
    meter: m.soilMoisture,
    accent: "var(--color-sev-high)",
    caption: "Past the 70% failure threshold",
  },
  {
    id: "slope",
    icon: TriangleRight,
    label: "Slope Gradient",
    value: m.slope,
    unit: "°",
    meter: (m.slope / 60) * 100,
    accent: "var(--color-sev-high)",
    caption: "Cut-slope steepness along NH-10",
  },
  {
    id: "elevation",
    icon: Mountain,
    label: "Elevation",
    value: m.elevation,
    unit: "m",
    meter: 64,
    accent: "var(--color-accent)",
    caption: "Terrain model resolution 30 m",
  },
];

export function TerrainIntelligence() {
  return (
    <Section id="terrain">
      <SectionHeader
        eyebrow="Terrain Intelligence"
        title={
          <>
            Four live signals, fused into one{" "}
            <span className="text-accent">risk brain</span>.
          </>
        }
        subtitle="NER-SHIELD continuously ingests environmental and terrain data across the region. Each signal is weighted by the model — together they explain where the ground is about to fail."
      />

      <motion.div
        variants={staggerParent}
        initial="hidden"
        whileInView="show"
        viewport={REVEAL_VIEWPORT}
        className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {SIGNALS.map((s) => (
          <motion.div
            key={s.id}
            variants={fadeUp}
            className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] p-5 transition-colors hover:border-white/15"
          >
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40"
              style={{ background: s.accent }}
            />
            <span
              className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[0.03]"
              style={{ color: s.accent }}
            >
              <s.icon size={18} />
            </span>
            <p className="mt-4 text-[11px] uppercase tracking-[0.14em] text-fg-dim">
              {s.label}
            </p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <AnimatedNumber
                value={s.value}
                decimals={s.decimals ?? 0}
                className="numeric text-3xl font-semibold text-fg"
              />
              <span className="text-xs text-fg-muted">{s.unit}</span>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/8">
              <motion.div
                className="h-full rounded-full"
                style={{ background: s.accent }}
                initial={{ width: 0 }}
                whileInView={{ width: `${Math.min(100, s.meter)}%` }}
                viewport={REVEAL_VIEWPORT}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              />
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-fg-muted">
              {s.caption}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
}
