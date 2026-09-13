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
    <div className="flex h-full flex-col gap-1 px-4 py-2">
      {/* Single header row — title, severity legend, observed/forecast key,
          current-risk status, and the time-range control. Never wraps: a
          wrap here previously ate a full extra row of height, which is what
          compressed the chart into colliding with its own labels. Below the
          2xl breakpoint the decorative legend items just don't render,
          rather than risk a wrap at some untested intermediate width. */}
      <div className="flex shrink-0 flex-nowrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 items-center gap-2">
            <Activity size={15} className="text-accent" />
            <h2 className="text-[16px] font-bold tracking-wide text-fg">
              Risk Timeline
            </h2>
          </div>
          {/* Decorative — the chart's own colors already carry this meaning. */}
          <span className="hidden shrink-0 items-center gap-3 2xl:flex">
            <LegendSwatch color={SEVERITY.critical.hex} label="Critical" />
            <LegendSwatch color={SEVERITY.high.hex} label="High" />
            <LegendSwatch color={SEVERITY.moderate.hex} label="Medium" />
            <LegendSwatch color={SEVERITY.low.hex} label="Low" />
          </span>
          <span className="hidden shrink-0 items-center gap-3 2xl:flex">
            <LegendLine swatch="solid" label="Observed" />
            <LegendLine swatch="dashed" label="Forecast" />
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-2 py-0.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-fg-dim">
              {selected?.label}
            </span>
            <span className="numeric text-[15px] font-bold leading-none text-fg">
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
                  "numeric rounded-md px-2 py-0.75 text-[10px] font-semibold transition-all duration-200",
                  r.id === rangeId
                    ? "bg-accent/15 text-accent shadow-[0_0_0_1px_rgba(34,197,94,0.35),0_0_10px_rgba(34,197,94,0.25)]"
                    : "text-fg-dim hover:bg-white/5 hover:text-fg-muted",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart — the main visual element */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <RiskTimeline rangeHours={range.hours} />
      </div>

      {/* Footer — one strip, divided by hairlines, not four boxed cards */}
      <div className="flex shrink-0 items-stretch divide-x divide-white/8 rounded-lg border border-white/8 bg-white/[0.02]">
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
    <div className="flex flex-1 items-center gap-2 px-3 py-1">
      <div className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-md bg-white/5", colorClass)}>
        <Icon size={11} />
      </div>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[9px] uppercase tracking-wider text-fg-dim">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="numeric text-[20px] font-bold leading-none text-fg">{value}</span>
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
