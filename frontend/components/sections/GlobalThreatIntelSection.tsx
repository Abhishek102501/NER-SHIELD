"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Loader2, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { REVEAL_VIEWPORT, fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { ThreatEvent, ThreatRisk, ThreatSummary } from "@/data/threats";
import type { ThreatDataSource } from "@/services/threats";

const ThreatMap = dynamic(() => import("@/components/map/ThreatMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#060a14] text-fg-dim">
      <Loader2 size={20} className="animate-spin" />
    </div>
  ),
});

const RISK_TOGGLES: { id: ThreatRisk; label: string; dot: string }[] = [
  { id: "high", label: "High", dot: "bg-sev-critical" },
  { id: "medium", label: "Medium", dot: "bg-sev-high" },
  { id: "low", label: "Low", dot: "bg-sev-low" },
];

export function GlobalThreatIntelSection() {
  const [summary, setSummary] = useState<ThreatSummary>({
    total: 0,
    high: 0,
    medium: 0,
    low: 0,
  });
  const [visibleRisks, setVisibleRisks] = useState<Record<ThreatRisk, boolean>>({
    high: true,
    medium: true,
    low: true,
  });
  // Demo until the map's fetch resolves — never claim "LIVE" before we know the source.
  const [source, setSource] = useState<ThreatDataSource>("demo");

  const toggleRisk = (id: ThreatRisk) =>
    setVisibleRisks((p) => ({ ...p, [id]: !p[id] }));

  const handleThreatsChange = (
    _threats: ThreatEvent[],
    s: ThreatSummary,
    dataSource: ThreatDataSource,
  ) => {
    setSummary(s);
    setSource(dataSource);
  };
  const isLive = source === "live";

  return (
    <Section id="threat-intel" className="border-t border-white/5">
      <SectionHeader
        eyebrow="Global Threat Intelligence"
        title={
          <>
            Detected entities, mapped across{" "}
            <span className="text-accent">every active location</span>.
          </>
        }
        subtitle="Visualize detected entities and security events across geographic locations."
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
            {isLive ? (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sev-critical/60" />
                <span className="relative h-2 w-2 rounded-full bg-sev-critical" />
              </span>
            ) : (
              <span className="h-2 w-2 rounded-full bg-fg-dim" />
            )}
            <span className="text-[12px] font-semibold text-fg">
              {isLive ? "LIVE" : "DEMO DATA"} · Threat Surveillance
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <ShieldAlert size={13} className="mr-0.5 text-fg-dim" />
            {RISK_TOGGLES.map((r) => (
              <button
                key={r.id}
                onClick={() => toggleRisk(r.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors",
                  visibleRisks[r.id]
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-white/10 text-fg-dim hover:text-fg-muted",
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", r.dot)} />
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="relative h-[400px] sm:h-[520px]">
          <ThreatMap
            className="h-full w-full"
            onThreatsChange={handleThreatsChange}
            visibleRisks={visibleRisks}
          />

          {/* Legend */}
          <div className="glass-float pointer-events-none absolute bottom-3 left-3 z-[500] rounded-lg px-3 py-2">
            <p className="eyebrow mb-1.5">Risk</p>
            <div className="flex flex-col gap-1">
              {RISK_TOGGLES.map((r) => (
                <div key={r.id} className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", r.dot)} />
                  <span className="text-[10px] text-fg-muted">{r.label} Risk</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 gap-px border-t border-white/8 bg-white/5 sm:grid-cols-4">
          <SummaryStat label="Total Events" value={summary.total} />
          <SummaryStat label="High Risk" value={summary.high} accent="text-sev-critical" />
          <SummaryStat label="Medium Risk" value={summary.medium} accent="text-sev-high" />
          <SummaryStat label="Low Risk" value={summary.low} accent="text-sev-low" />
        </div>
      </motion.div>
    </Section>
  );
}

function SummaryStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="bg-panel px-4 py-3">
      <p className="eyebrow mb-1">{label}</p>
      <p className={cn("numeric text-xl font-semibold", accent ?? "text-fg")}>
        {value}
      </p>
    </div>
  );
}
