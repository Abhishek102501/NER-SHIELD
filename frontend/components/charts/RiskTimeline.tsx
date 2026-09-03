"use client";

import { motion } from "framer-motion";
import {
  ArrowRightLeft,
  Gavel,
  KeyRound,
  Link2,
  ShieldAlert,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  ComposedChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { eventsForRange, formatHourOffset, RISK_BANDS, riskBand, seriesForRange } from "@/data/timeline";
import { useCommand } from "@/lib/command-context";
import { SEVERITY, cn } from "@/lib/utils";
import type { Severity, TimelineEvent, TimelinePoint } from "@/types";

const EVENT_ICON: Record<string, LucideIcon> = {
  "evt-potential-threat": TriangleAlert,
  "evt-pii-exposure": ShieldAlert,
  "evt-data-transfer": ArrowRightLeft,
  "evt-entity-correlation": Link2,
  "evt-suspicious-login": KeyRound,
  "evt-policy-violation": Gavel,
};

/** Vertical gradient stop offsets, keyed to the fixed 0–100 risk domain. */
const BAND_STOPS: { offset: string; band: Severity }[] = [
  { offset: "0%", band: "critical" },
  { offset: "10%", band: "critical" },
  { offset: "11%", band: "high" },
  { offset: "30%", band: "high" },
  { offset: "31%", band: "moderate" },
  { offset: "60%", band: "moderate" },
  { offset: "61%", band: "low" },
  { offset: "100%", band: "low" },
];

interface ChartDatum extends TimelinePoint {
  observedValue: number | null;
  forecastValue: number | null;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: ChartDatum }>;
}

function eventAt(events: TimelineEvent[], hourOffset: number): TimelineEvent | undefined {
  return events.find((e) => e.hourOffset === hourOffset);
}

function TimelineTooltip({ active, payload, events }: ChartTooltipProps & { events: TimelineEvent[] }) {
  if (!active || !payload?.length) return null;
  const datum = payload[0]?.payload;
  if (!datum) return null;
  const band = riskBand(datum.risk);
  const event = eventAt(events, datum.hourOffset);

  return (
    <div className="glass-float min-w-37.5 rounded-lg px-3 py-2 text-[11px]">
      <div className="flex items-center justify-between gap-3">
        <p className="numeric text-fg-dim">{datum.label}</p>
        <span
          className={cn(
            "text-[9px] font-bold uppercase tracking-wider",
            datum.forecast ? "text-accent" : "text-fg-dim",
          )}
        >
          {datum.forecast ? "Forecast" : "Observed"}
        </span>
      </div>
      <p className="mt-1 flex items-center gap-1.5 font-semibold">
        <span className="h-2 w-2 rounded-full" style={{ background: SEVERITY[band].hex }} />
        <span className="numeric text-fg">{datum.risk}</span>
        <span className={cn("text-[9px] font-semibold uppercase", SEVERITY[band].text)}>
          {SEVERITY[band].label}
        </span>
      </p>
      {event && (
        <div className="mt-1.5 border-t border-white/8 pt-1.5">
          <p className="text-[11px] font-semibold text-fg">{event.title}</p>
          <p className="text-[10px] text-fg-dim">
            {event.category}
            {event.entity ? ` · ${event.entity}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}

/** Explicit tick sets per range — avoids near-duplicate labels (e.g. two "-4D" ticks). */
function buildTicks(hoursBack: number): number[] {
  switch (hoursBack) {
    case 12:
      return [-12, -6, 0, 12, 24];
    case 24:
      return [-24, -12, 0, 12, 24];
    case 48:
      return [-48, -24, -12, 0, 12, 24];
    case 168:
      return [-168, -96, -24, 0, 24];
    default:
      return [-hoursBack, -hoursBack / 2, 0, 12, 24];
  }
}

interface EventMarkerProps {
  cx?: number;
  cy?: number;
  event: TimelineEvent;
  active: boolean;
  onSelect: (event: TimelineEvent, cx: number, cy: number) => void;
}

function EventMarker({ cx, cy, event, active, onSelect }: EventMarkerProps) {
  if (cx == null || cy == null) return null;
  const color = SEVERITY[event.severity].hex;
  return (
    <g
      transform={`translate(${cx},${cy})`}
      onClick={(ev) => {
        ev.stopPropagation();
        onSelect(event, cx, cy);
      }}
      className="cursor-pointer"
      style={{ color }}
    >
      {active && <circle r={10} className="pulse-ring" style={{ color }} />}
      <circle r={9} fill={color} fillOpacity={0.16} />
      <circle
        r={active ? 4.5 : 3.5}
        fill={color}
        stroke="#05070e"
        strokeWidth={1.5}
        style={{ filter: `drop-shadow(0 0 4px ${color}aa)` }}
      />
    </g>
  );
}

export function RiskTimeline({ rangeHours }: { rangeHours: number }) {
  const { selectedTimelineId, selectTimeline, selectedEventId, selectEvent } = useCommand();
  // Pixel anchor for the popup card — pure presentation, not selection state.
  // The selection itself lives in shared `selectedEventId` (also driven by the map).
  const [anchor, setAnchor] = useState<{ id: string; x: number; y: number } | null>(null);

  const series = useMemo(() => seriesForRange(rangeHours), [rangeHours]);
  const events = useMemo(() => eventsForRange(rangeHours), [rangeHours]);

  const data: ChartDatum[] = useMemo(
    () =>
      series.map((p) => ({
        ...p,
        observedValue: p.hourOffset <= 0 ? p.risk : null,
        forecastValue: p.hourOffset >= 0 ? p.risk : null,
      })),
    [series],
  );

  const nowPoint = data.find((d) => d.now) ?? data[data.length - 1];
  const ticks = useMemo(() => buildTicks(rangeHours), [rangeHours]);
  const byOffset = useMemo(() => new Map(data.map((d) => [d.hourOffset, d])), [data]);

  // Derived, not stored: an event no longer in the visible range (time-range switch,
  // or selection made from the map for a point outside this window) simply stops
  // rendering a popup card here — no effect needed to reset it.
  const activeEvent = events.find((e) => e.id === selectedEventId) ?? null;
  const activePopup =
    activeEvent && anchor && anchor.id === activeEvent.id
      ? { event: activeEvent, x: anchor.x, y: anchor.y }
      : null;

  return (
    <motion.div
      key={rangeHours}
      initial={{ opacity: 0.35 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative h-full w-full"
      onClick={() => selectEvent(null)}
    >
      {/* Compact risk scale */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 flex flex-col gap-0.75 py-1">
        {RISK_BANDS.map((b) => (
          <div key={b.band} className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: SEVERITY[b.band].hex }} />
            <span className="numeric text-[8px] leading-none text-fg-dim">
              {b.min}
              {b.max < 100 ? `–${b.max}` : "+"}
            </span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 14, right: 10, bottom: 0, left: 34 }}
          onClick={(state: { activeLabel?: string | number }) => {
            const offset = Number(state?.activeLabel);
            const point = byOffset.get(offset);
            if (point) selectTimeline(point.id);
          }}
          className="cursor-pointer"
        >
          <defs>
            <linearGradient id="riskFillObserved" x1="0" y1="0" x2="0" y2="1">
              {BAND_STOPS.map((s, i) => (
                <stop key={i} offset={s.offset} stopColor={SEVERITY[s.band].hex} stopOpacity={0.24} />
              ))}
            </linearGradient>
            <linearGradient id="riskFillForecast" x1="0" y1="0" x2="0" y2="1">
              {BAND_STOPS.map((s, i) => (
                <stop key={i} offset={s.offset} stopColor={SEVERITY[s.band].hex} stopOpacity={0.1} />
              ))}
            </linearGradient>
            <linearGradient id="riskStroke" x1="0" y1="0" x2="0" y2="1">
              {BAND_STOPS.map((s, i) => (
                <stop key={i} offset={s.offset} stopColor={SEVERITY[s.band].hex} stopOpacity={1} />
              ))}
            </linearGradient>
          </defs>

          <XAxis
            dataKey="hourOffset"
            type="number"
            domain={[-rangeHours, 24]}
            ticks={ticks}
            tickFormatter={(v: number) => formatHourOffset(v)}
            tick={(props: {
              x?: string | number;
              y?: string | number;
              payload?: { value?: number };
            }) => {
              const x = Number(props.x ?? 0);
              const y = Number(props.y ?? 0);
              const value = Number(props.payload?.value ?? 0);
              const isNow = value === 0;
              return (
                <text
                  x={x}
                  y={y + 12}
                  textAnchor="middle"
                  className="numeric"
                  fill={isNow ? "#22d3ee" : "#5f6c83"}
                  fontSize={9}
                  fontWeight={isNow ? 700 : 500}
                >
                  {formatHourOffset(value)}
                </text>
              );
            }}
            tickLine={false}
            axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
          />
          <YAxis hide domain={[0, 100]} />

          <Tooltip
            content={<TimelineTooltip events={events} />}
            cursor={{ stroke: "rgba(255,255,255,0.14)", strokeDasharray: "4 4" }}
          />

          {/* Observed vs forecast zone labels + NOW divider */}
          <ReferenceLine
            x={0}
            stroke="#22d3ee"
            strokeOpacity={0.6}
            strokeDasharray="3 3"
            label={(props: { viewBox?: { x?: number; y?: number } }) => {
              const vx = props.viewBox?.x ?? 0;
              const vy = props.viewBox?.y ?? 0;
              return (
                <g>
                  <text x={vx} y={vy - 3} textAnchor="middle" fontSize={8} fontWeight={700} fill="#22d3ee" className="numeric">
                    NOW
                  </text>
                  <text x={vx - 8} y={vy + 11} textAnchor="end" fontSize={8} fill="#5f6c83" className="numeric uppercase tracking-wider">
                    Observed
                  </text>
                  <text x={vx + 8} y={vy + 11} textAnchor="start" fontSize={8} fill="#22d3ee" fillOpacity={0.8} className="numeric uppercase tracking-wider">
                    Forecast
                  </text>
                </g>
              );
            }}
          />

          <Area
            type="monotone"
            dataKey="observedValue"
            stroke="url(#riskStroke)"
            strokeWidth={2.5}
            fill="url(#riskFillObserved)"
            connectNulls
            isAnimationActive
            animationDuration={700}
            dot={false}
            activeDot={{ r: 4, stroke: "#05070e", strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="forecastValue"
            stroke="url(#riskStroke)"
            strokeWidth={2}
            strokeDasharray="5 4"
            strokeOpacity={0.75}
            fill="url(#riskFillForecast)"
            connectNulls
            isAnimationActive
            animationDuration={700}
            dot={false}
            activeDot={{ r: 4, stroke: "#05070e", strokeWidth: 2, opacity: 0.85 }}
          />

          {/* NOW glow marker at the current risk value */}
          <ReferenceDot
            x={0}
            y={nowPoint?.risk ?? 0}
            shape={(props: { cx?: number; cy?: number }) => {
              const { cx, cy } = props;
              if (cx == null || cy == null) return <g />;
              return (
                <g transform={`translate(${cx},${cy})`} style={{ color: "#22d3ee" }}>
                  <circle r={9} className="pulse-ring" />
                  <circle r={4} fill="#22d3ee" stroke="#05070e" strokeWidth={2} />
                </g>
              );
            }}
          />

          {/* Event markers */}
          {events.map((event) => {
            const point = byOffset.get(event.hourOffset);
            if (!point) return null;
            return (
              <ReferenceDot
                key={event.id}
                x={event.hourOffset}
                y={point.risk}
                shape={(props: { cx?: number; cy?: number }) => (
                  <EventMarker
                    cx={props.cx}
                    cy={props.cy}
                    event={event}
                    active={selectedEventId === event.id}
                    onSelect={(evt, cx, cy) => {
                      selectTimeline(byOffset.get(evt.hourOffset)?.id ?? selectedTimelineId);
                      const next = selectedEventId === evt.id ? null : evt.id;
                      selectEvent(next);
                      setAnchor(next ? { id: evt.id, x: cx, y: cy } : null);
                    }}
                  />
                )}
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Event popup card */}
      {activePopup && (
        <EventPopup
          event={activePopup.event}
          x={activePopup.x}
          y={activePopup.y}
          flip={activePopup.event.hourOffset > (24 - rangeHours) * 0.15}
          onClose={() => selectEvent(null)}
        />
      )}
    </motion.div>
  );
}

function EventPopup({
  event,
  x,
  y,
  flip,
  onClose,
}: {
  event: TimelineEvent;
  x: number;
  y: number;
  flip: boolean;
  onClose: () => void;
}) {
  const Icon = EVENT_ICON[event.id] ?? ShieldAlert;
  const sev = SEVERITY[event.severity];
  return (
    // Static anchor/flip lives on this plain element — Framer Motion owns its own
    // `transform` for the entrance animation, so the two can't be combined on one node.
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        left: x,
        top: Math.max(y - 12, 0),
        transform: `translate(${flip ? "-100%" : "0%"}, -100%)`,
      }}
      className="z-30"
    >
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      className="glass-float w-47 rounded-lg p-2.5"
    >
      <span className="absolute inset-x-0 top-0 h-0.5 rounded-t-lg" style={{ background: sev.hex }} />
      <div className="flex items-start gap-2">
        <div
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md"
          style={{ background: `${sev.hex}1f`, color: sev.hex }}
        >
          <Icon size={12} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold text-fg">{event.title}</p>
          <p className="text-[9px] text-fg-dim">{event.category}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close event details"
          className="shrink-0 text-fg-dim hover:text-fg"
        >
          ×
        </button>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[9px]">
        <span className={cn("font-bold uppercase tracking-wider", sev.text)}>{sev.label} Risk</span>
        <span className="numeric text-fg-dim">{event.time}</span>
      </div>
      {event.entity && (
        <p className="mt-1 text-[9px] text-fg-dim">
          Entity: <span className="text-fg-muted">{event.entity}</span>
        </p>
      )}
    </motion.div>
    </div>
  );
}
