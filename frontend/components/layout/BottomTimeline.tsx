"use client";

import { Activity, ShieldAlert, ShieldCheck, ShieldHalf, ShieldQuestion } from "lucide-react";
import { useMemo, useState } from "react";
import { RiskTimeline } from "@/components/charts/RiskTimeline";
import {
  DEFAULT_RANGE_ID,
  observedForRange,
  percentChange,
  previousObservedWindow,
  seriesForRange,
  summarizeSeries,
  TIME_RANGES,
} from "@/data/timeline";
import { useCommand } from "@/lib/command-context";
import { SEVERITY, cn } from "@/lib/utils";

export function BottomTimeline() {
  const { selectedTimelineId, selectTimeline } = useCommand();
  const [rangeId, setRangeId] = useState(DEFAULT_RANGE_ID);

  const range = TIME_RANGES.find((r) => r.id === rangeId) ?? TIME_RANGES[0];
  const series = useMemo(() => seriesForRange(range.hours), [range.hours]);
  const selected =
    series.find((p) => p.id === selectedTimelineId) ??
    series.find((p) => p.now) ??
    series[series.length - 1];
  const isForecast = !!selected?.forecast;

  const summary = useMemo(() => summarizeSeries(observedForRange(range.hours)), [range.hours]);
  const prevSummary = useMemo(
    () => summarizeSeries(previousObservedWindow(range.hours)),
    [range.hours],
  );

  return (
    <div className="flex h-full flex-col px-4 py-2">
      {/* Header */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Activity size={15} className="text-accent" />
            <h2 className="text-[13px] font-bold tracking-wide text-fg">
              Risk Timeline
            </h2>
          </div>
          <span className="hidden items-center gap-3 lg:flex">
            <LegendSwatch color={SEVERITY.critical.hex} label="Critical" />
            <LegendSwatch color={SEVERITY.high.hex} label="High" />
            <LegendSwatch color={SEVERITY.moderate.hex} label="Medium" />
            <LegendSwatch color={SEVERITY.low.hex} label="Low" />
            <LegendLine swatch="solid" label="Observed" />
            <LegendLine swatch="dashed" label="Forecast" />
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Selected readout */}
          <div className="hidden items-center gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-1 md:flex">
            <span className="eyebrow">{selected?.label}</span>
            <span className="numeric text-sm font-semibold text-fg">
              {selected?.risk}%
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

          {/* Time range controls */}
          <div className="flex items-center gap-0.5 rounded-lg border border-white/8 bg-white/[0.02] p-0.5">
            {TIME_RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setRangeId(r.id);
                  selectTimeline(
                    seriesForRange(r.hours).find((p) => p.now)?.id ?? selectedTimelineId,
                  );
                }}
                className={cn(
                  "numeric rounded-md px-2 py-1 text-[10px] font-semibold transition-all duration-200",
                  r.id === rangeId
                    ? "bg-accent/15 text-accent shadow-[0_0_0_1px_rgba(34,211,238,0.35),0_0_10px_rgba(34,211,238,0.25)]"
                    : "text-fg-dim hover:bg-white/5 hover:text-fg-muted",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-1 min-h-0 flex-1">
        <RiskTimeline rangeHours={range.hours} />
      </div>

      {/* Summary strip */}
      <div className="mt-1.5 grid shrink-0 grid-cols-4 gap-1.5">
        <SummaryStat
          icon={ShieldQuestion}
          label="Total Events"
          value={summary.total}
          change={percentChange(summary.total, prevSummary.total)}
          colorClass="text-fg-muted"
        />
        <SummaryStat
          icon={ShieldAlert}
          label="High Risk"
          value={summary.critical + summary.high}
          change={percentChange(
            summary.critical + summary.high,
            prevSummary.critical + prevSummary.high,
          )}
          colorClass={SEVERITY.critical.text}
        />
        <SummaryStat
          icon={ShieldHalf}
          label="Medium Risk"
          value={summary.moderate}
          change={percentChange(summary.moderate, prevSummary.moderate)}
          colorClass={SEVERITY.moderate.text}
        />
        <SummaryStat
          icon={ShieldCheck}
          label="Low Risk"
          value={summary.low}
          change={percentChange(summary.low, prevSummary.low)}
          colorClass={SEVERITY.low.text}
        />
      </div>
    </div>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] text-fg-dim">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function LegendLine({ swatch, label }: { swatch: "solid" | "dashed"; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] text-fg-dim">
      <span
        className={cn(
          "h-0 w-4 border-t-2 border-accent",
          swatch === "dashed" && "border-dashed opacity-70",
        )}
      />
      {label}
    </span>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  change,
  colorClass,
}: {
  icon: typeof ShieldAlert;
  label: string;
  value: number;
  change: number | null;
  colorClass: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-1.5">
      <div className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/5", colorClass)}>
        <Icon size={12} />
      </div>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[9px] uppercase tracking-wider text-fg-dim">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="numeric text-[13px] font-bold text-fg">{value}</span>
          {change != null && change !== 0 && (
            <span
              className={cn(
                "numeric text-[9px] font-semibold",
                change > 0 ? "text-sev-high" : "text-sev-low",
              )}
            >
              {change > 0 ? "↑" : "↓"}
              {Math.abs(change)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
