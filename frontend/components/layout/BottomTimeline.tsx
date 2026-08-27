"use client";

import { Activity } from "lucide-react";
import { RiskTimeline } from "@/components/charts/RiskTimeline";
import { RISK_TIMELINE } from "@/data/timeline";
import { useCommand } from "@/lib/command-context";
import { cn } from "@/lib/utils";

export function BottomTimeline() {
  const { selectedTimelineId, selectTimeline } = useCommand();
  const selected =
    RISK_TIMELINE.find((p) => p.id === selectedTimelineId) ?? RISK_TIMELINE[0];
  const isForecast = !!selected.forecast;

  return (
    <div className="flex h-full flex-col px-4 py-2.5">
      {/* Header */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Activity size={15} className="text-accent" />
            <h2 className="text-[13px] font-bold tracking-wide text-fg">
              Risk Timeline
            </h2>
          </div>
          <span className="hidden items-center gap-3 sm:flex">
            <Legend swatch="solid" label="Observed" />
            <Legend swatch="dashed" label="Forecast" />
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Selected readout */}
          <div className="hidden items-center gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-1 md:flex">
            <span className="eyebrow">{selected.label}</span>
            <span className="numeric text-sm font-semibold text-fg">
              {selected.risk}%
            </span>
            <span
              className={cn(
                "text-[9px] font-semibold uppercase tracking-wider",
                isForecast ? "text-accent" : "text-sev-high",
              )}
            >
              {isForecast ? "Forecast" : "Observed"}
            </span>
          </div>

          {/* Period chips */}
          <div className="flex items-center gap-1">
            {RISK_TIMELINE.map((p) => (
              <button
                key={p.id}
                onClick={() => selectTimeline(p.id)}
                className={cn(
                  "numeric rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                  p.id === selectedTimelineId
                    ? "bg-accent/15 text-accent"
                    : p.now
                      ? "text-accent/70 hover:bg-white/5"
                      : "text-fg-dim hover:bg-white/5 hover:text-fg-muted",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-1 min-h-0 flex-1">
        <RiskTimeline />
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: "solid" | "dashed"; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] text-fg-dim">
      <span
        className={cn(
          "h-0 w-4 border-t-2 border-sev-high",
          swatch === "dashed" && "border-dashed opacity-80",
        )}
      />
      {label}
    </span>
  );
}
