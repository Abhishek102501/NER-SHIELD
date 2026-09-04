"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowUpRight, Crosshair, Layers, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { ZoneDetailPanel } from "@/components/map/ZoneDetailPanel";
import type { LiveMapApi } from "@/components/map/LiveMap";
import { Section } from "@/components/ui/Section";
import { REVEAL_VIEWPORT, fadeUp } from "@/lib/motion";
import type { RiskZone, Severity } from "@/types";
import { SEVERITY, cn } from "@/lib/utils";

const LiveMap = dynamic(() => import("@/components/map/LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0d121f] text-white/50">
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
  { id: "schools", label: "Schools" },
  { id: "infrastructure", label: "Infra" },
];

const LEGEND: Severity[] = ["critical", "high", "moderate", "low"];

export function GisCommandSection() {
  const [zone, setZone] = useState<RiskZone | null>(null);
  const apiRef = useRef<LiveMapApi | null>(null);
  const [layers, setLayers] = useState<Record<string, boolean>>(
    Object.fromEntries(TOGGLES.map((t) => [t.id, true])),
  );

  const toggle = (id: string) =>
    setLayers((p) => ({ ...p, [id]: !p[id] }));

  return (
    <Section id="command" className="bg-[#000000] text-white py-20 border-b border-hairline relative">
      {/* Polarity-flipped dark showcase band header from DESIGN.md */}
      <div className="max-w-3xl mb-12">
        <span className="caption-mono text-accent block mb-2 font-medium">GIS COMMAND CENTER.</span>
        <h2 className="display-lg text-white">
          The whole region, as one operational picture.
        </h2>
        <p className="body-lg text-white/70 mt-4">
          A live MapLibre operations map ingesting risk zones, precipitation levels, emergency incidents, and highway infrastructure across North-East India.
        </p>
      </div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={REVEAL_VIEWPORT}
        className="rounded-xl bg-[#09090b] overflow-hidden border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.8)]"
      >
        {/* Toolbar in code-editor-mockup style */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 px-5 py-3.5 bg-black/60">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative h-2 w-2 rounded-full bg-accent" />
            </span>
            <span className="caption-mono text-[11px] text-white">
              LIVE GIS OPERATIONAL PICTURE · NORTH EAST REGION
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Layers size={13} className="mr-1 text-white/50" />
            {TOGGLES.map((t) => (
              <button
                key={t.id}
                onClick={() => toggle(t.id)}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] caption-mono transition-colors cursor-pointer border",
                  layers[t.id]
                    ? "border-accent bg-accent/20 text-accent font-semibold"
                    : "border-white/10 text-white/50 hover:text-white/80 hover:border-white/25",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Map Canvas Frame */}
        <div className="relative h-[440px] sm:h-[540px]">
          <LiveMap
            className="h-full w-full"
            onZoneSelect={setZone}
            selectedZoneId={zone?.id ?? null}
            layers={layers}
            onReady={(api) => {
              apiRef.current = api;
            }}
          />

          {/* Recenter control */}
          <button
            onClick={() => apiRef.current?.reset()}
            aria-label="Recenter map"
            title="Recenter on region"
            className="glass-float absolute left-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-lg text-fg-muted transition-colors hover:text-accent"
          >
            <Crosshair size={16} />
          </button>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 z-10 rounded-lg border border-white/15 bg-black/90 px-3.5 py-2.5 backdrop-blur-md">
            <p className="caption-mono text-[10px] text-white/60 mb-2">RISK LEVEL</p>
            <div className="flex flex-col gap-1.5">
              {LEGEND.map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", SEVERITY[s].dot)} />
                  <span className="caption-mono text-[10px] text-white/90">
                    {SEVERITY[s].label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <ZoneDetailPanel
            zone={zone}
            onClose={() => setZone(null)}
            onFocus={(d) => apiRef.current?.flyTo(d.center, 11)}
            focusLabel="Zoom to zone"
          />
        </div>

        {/* Dark Section Footer CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/15 px-5 py-3.5 bg-black/60">
          <p className="caption-mono text-[11px] text-white/50">
            DEMONSTRATION GIS INFRASTRUCTURE · ZERO EXTERNAL TILE DEPENDENCIES
          </p>
          <Link
            href="/command"
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 body-sm font-semibold text-black shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Open Full Tactical Command</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </motion.div>
    </Section>
  );
}


