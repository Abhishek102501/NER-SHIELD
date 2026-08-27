"use client";

import {
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RISK_TIMELINE } from "@/data/timeline";
import { useCommand } from "@/lib/command-context";

interface TimelineDatum {
  id: string;
  label: string;
  risk: number;
  past: number | null;
  future: number | null;
  now: boolean;
}

interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: Array<{
    value?: number | string;
    dataKey?: string | number;
    payload?: TimelineDatum;
  }>;
}

const DATA = RISK_TIMELINE.map((p) => ({
  id: p.id,
  label: p.label,
  risk: p.risk,
  past: !p.forecast ? p.risk : null,
  future: p.forecast || p.now ? p.risk : null,
  now: !!p.now,
}));

const LABEL_TO_ID = new Map(RISK_TIMELINE.map((p) => [p.label, p.id]));

function riskColor(v: number) {
  if (v >= 85) return "#ef4444";
  if (v >= 70) return "#f97316";
  if (v >= 50) return "#eab308";
  return "#22c55e";
}

function TimelineTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const risk = payload.find((p) => p.dataKey === "risk")?.value as
    | number
    | undefined;
  if (risk == null) return null;
  const datum = payload[0]?.payload;
  const isForecast = datum?.future != null && !datum?.now;
  return (
    <div className="glass-float rounded-lg px-3 py-2 text-[11px]">
      <p className="numeric mb-0.5 text-fg-dim">{label}</p>
      <p className="flex items-center gap-1.5 font-semibold">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: riskColor(risk) }}
        />
        <span className="numeric text-fg">{risk}% risk index</span>
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-fg-dim">
        {isForecast ? "Forecast" : "Observed"}
      </p>
    </div>
  );
}

export function RiskTimeline() {
  const { selectedTimelineId, selectTimeline } = useCommand();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={DATA}
        margin={{ top: 12, right: 8, bottom: 0, left: 8 }}
        onClick={(state: { activeLabel?: string | number }) => {
          const lbl = state?.activeLabel == null ? "" : String(state.activeLabel);
          if (lbl && LABEL_TO_ID.has(lbl)) {
            selectTimeline(LABEL_TO_ID.get(lbl)!);
          }
        }}
        className="cursor-pointer"
      >
        <defs>
          <linearGradient id="riskArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <XAxis
          dataKey="label"
          tick={(props: {
            x?: string | number;
            y?: string | number;
            payload?: { value?: string | number };
          }) => {
            const x = Number(props.x ?? 0);
            const y = Number(props.y ?? 0);
            const value = String(props.payload?.value ?? "");
            const id = LABEL_TO_ID.get(value);
            const isSel = id === selectedTimelineId;
            const isNow = value === "NOW";
            return (
              <text
                x={x}
                y={y + 12}
                textAnchor="middle"
                className="numeric"
                fill={isSel ? "#e8eef8" : isNow ? "#22d3ee" : "#5f6c83"}
                fontSize={9}
                fontWeight={isSel || isNow ? 700 : 500}
              >
                {value}
              </text>
            );
          }}
          tickLine={false}
          axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
          interval={0}
        />
        <YAxis hide domain={[40, 100]} />

        <Tooltip
          content={<TimelineTooltip />}
          cursor={{ stroke: "rgba(255,255,255,0.14)", strokeDasharray: "4 4" }}
        />

        <ReferenceLine
          x="NOW"
          stroke="#22d3ee"
          strokeDasharray="3 3"
          strokeOpacity={0.7}
        />

        <Area
          type="monotone"
          dataKey="risk"
          stroke="none"
          fill="url(#riskArea)"
          animationDuration={1200}
          activeDot={{
            r: 4,
            fill: "#f97316",
            stroke: "#0b1120",
            strokeWidth: 2,
          }}
          dot={(props: {
            cx?: number;
            cy?: number;
            index?: number;
            payload?: TimelineDatum;
          }) => {
            const { cx, cy, payload, index } = props;
            const sel = payload?.id === selectedTimelineId;
            const key = `dot-${payload?.id ?? index}`;
            if (!sel) return <g key={key} />;
            return (
              <g key={key}>
                <circle cx={cx} cy={cy} r={7} fill="#f9731622" />
                <circle
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill="#f97316"
                  stroke="#0b1120"
                  strokeWidth={2}
                />
              </g>
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="past"
          stroke="#f97316"
          strokeWidth={2.5}
          dot={false}
          connectNulls
          animationDuration={1200}
        />
        <Line
          type="monotone"
          dataKey="future"
          stroke="#f97316"
          strokeWidth={2}
          strokeDasharray="5 4"
          strokeOpacity={0.8}
          dot={false}
          connectNulls
          animationDuration={1200}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
