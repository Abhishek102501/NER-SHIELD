"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowUpRight, Layers, Loader2 } from "lucide-react";
import { useState } from "react";
import { ZoneDetailPanel } from "@/components/map/ZoneDetailPanel";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { REVEAL_VIEWPORT, fadeUp } from "@/lib/motion";
import type { RiskZone, Severity } from "@/types";
import { SEVERITY, cn } from "@/lib/utils";

const LiveMap = dynamic(() => import("@/components/map/LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#060a14] text-fg-dim">
      <Loader2 size={20} className="animate-spin" />
    </div>
  ),
});

const TOGGLES: { id: string; label: string }[] = [
  { id: "risk-zones", label: "Risk Zones" },
  { id: "rainfall", label: "Rainfall" },
  { id: "roads", label: "Roads" },
  { id: "incidents", label: "Incidents" },
  { id: "villages", label: "Villages" },
  { id: "infrastructure", label: "Infra" },
];

const LEGEND: Severity[] = ["critical", "high", "moderate", "low"];

export function GisCommandSection() {
  const [zone, setZone] = useState<RiskZone | null>(null);
  const [layers, setLayers] = useState<Record<string, boolean>>(
    Object.fromEntries(TOGGLES.map((t) => [t.id, true])),
  );

  const toggle = (id: string) =>
    setLayers((p) => ({ ...p, [id]: !p[id] }));

  return (
    <Section id="command" className="border-t border-white/5">
      <SectionHeader
        eyebrow="GIS Command Center"
        title={
          <>
            The whole region, as one{" "}
            <span className="text-accent">operational picture</span>.
          </>
        }
        subtitle="A live MapLibre operations map — risk zones, rainfall, incidents and infrastructure in one view. Click any risk zone to open its assessment."
      />

      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={REVEAL_VIEWPORT}
        className="glass relative mt-10 overflow-hidden rounded-2xl border border-white/10"
      >
        {/* Toolbar */}
        <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sev-low/60" />
              <span className="relative h-2 w-2 rounded-full bg-sev-low" />
            </span>
            <span className="text-[12px] font-semibold text-fg">
              Live GIS · North Eastern Region
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Layers size={13} className="mr-0.5 text-fg-dim" />
            {TOGGLES.map((t) => (
              <button
                key={t.id}
                onClick={() => toggle(t.id)}
                className={cn(
                  "rounded-md border px-2 py-1 text-[10px] font-medium transition-colors",
                  layers[t.id]
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-white/10 text-fg-dim hover:text-fg-muted",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="relative h-[400px] sm:h-[520px]">
          <LiveMap
            className="h-full w-full"
            onZoneSelect={setZone}
            selectedZoneId={zone?.id ?? null}
            layers={layers}
          />

          {/* Legend */}
          <div className="glass-float pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg px-3 py-2">
            <p className="eyebrow mb-1.5">Risk</p>
            <div className="flex flex-col gap-1">
              {LEGEND.map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", SEVERITY[s].dot)} />
                  <span className="text-[10px] text-fg-muted">
                    {SEVERITY[s].label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <ZoneDetailPanel zone={zone} onClose={() => setZone(null)} />
        </div>

        {/* Footer CTA */}
        <div className="flex items-center justify-between gap-3 border-t border-white/8 px-4 py-3">
          <p className="text-[11px] text-fg-dim">
            Demonstration GIS layers · self-contained, no external tiles
          </p>
          <Link
            href="/command"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[12px] font-semibold text-black transition-transform hover:-translate-y-0.5"
          >
            Open full command center
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </motion.div>
    </Section>
  );
}
