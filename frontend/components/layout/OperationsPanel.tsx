"use client";

import { PanelLeftClose, Radio } from "lucide-react";
import { IncidentList } from "@/components/dashboard/IncidentList";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RainfallForecastPanel } from "@/components/rainfall/RainfallForecastPanel";
import { SYSTEM_METRICS, SYSTEM_STATUS } from "@/data/system";
import { useCommand, type LiveMetrics } from "@/lib/command-context";

const LIVE_KEY: Record<string, keyof LiveMetrics> = {
  "active-alerts": "activeAlerts",
  "critical-zones": "criticalZones",
  "active-incidents": "activeIncidents",
  "field-reports": "fieldReports",
};

export function OperationsPanel({ onCollapse }: { onCollapse: () => void }) {
  const { live, landslideAnalysis } = useCommand();
  const detections = landslideAnalysis?.status === "completed" ? landslideAnalysis.detections : [];
  const summary = landslideAnalysis?.status === "completed" ? landslideAnalysis.summary : null;
  const largest = detections.reduce<(typeof detections)[number] | null>(
    (max, d) => (!max || d.areaKm2 > max.areaKm2 ? d : max),
    null,
  );
  const avgConfidence =
    detections.length > 0
      ? detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length
      : null;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-4 py-3">
        <div>
          <h2 className="text-[13px] font-bold tracking-wide text-fg">
            Operations
          </h2>
          <p className="eyebrow mt-1">Command Overview</p>
        </div>
        <button
          onClick={onCollapse}
          aria-label="Collapse operations panel"
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-fg-muted transition-colors hover:bg-white/5 hover:text-fg"
        >
          <PanelLeftClose size={15} />
        </button>
      </div>

      {/* Scroll body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <p className="eyebrow">System Status</p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sev-low/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-sev-low">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sev-low/70" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-sev-low" />
              </span>
              Live · Demo
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {SYSTEM_METRICS.map((m, i) => (
              <MetricCard
                key={m.id}
                metric={m}
                index={i}
                liveValue={LIVE_KEY[m.id] ? live[LIVE_KEY[m.id]] : undefined}
              />
            ))}
          </div>
        </section>

        {summary && (
          <section className="mt-5">
            <div className="mb-2.5 flex items-center justify-between">
              <p className="eyebrow">Landslide AI</p>
              {landslideAnalysis?.mode === "mock" && (
                <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-sev-moderate">
                  Mock Mode
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MiniStat label="Landslide Zones" value={String(summary.detections)} />
              <MiniStat label="Affected Area" value={`${summary.affectedAreaKm2.toFixed(1)} km²`} />
              <MiniStat label="High Risk Zones" value={String(summary.critical + summary.high)} />
              <MiniStat
                label="Avg. Confidence"
                value={avgConfidence !== null ? `${Math.round(avgConfidence * 100)}%` : "—"}
              />
              <MiniStat
                label="Largest Detection"
                value={largest ? `${largest.areaKm2.toFixed(2)} km²` : "—"}
              />
            </div>
          </section>
        )}

        <section className="mt-5">
          <RainfallForecastPanel />
        </section>

        <section className="mt-5">
          <div className="mb-2.5 flex items-center justify-between">
            <p className="eyebrow">Recent Incidents</p>
            <span className="inline-flex items-center gap-1 text-[10px] text-fg-dim">
              <Radio size={10} className="text-sev-low" />
              {SYSTEM_STATUS.dataFreshness}
            </span>
          </div>
          <IncidentList />
        </section>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <p className="eyebrow leading-tight">{label}</p>
      <p className="numeric mt-1.5 text-lg font-semibold leading-none text-fg">{value}</p>
    </div>
  );
}
