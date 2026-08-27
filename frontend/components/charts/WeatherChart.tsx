"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RAINFALL_24H } from "@/data/weather";

interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ value?: number | string; dataKey?: string | number }>;
}

function RainTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-float rounded-lg px-2.5 py-1.5 text-[11px]">
      <p className="numeric text-fg-dim">{label}h</p>
      <p className="numeric font-semibold text-accent">
        {payload[0]?.value} mm
      </p>
    </div>
  );
}

export function WeatherChart() {
  return (
    <div className="h-24 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={RAINFALL_24H}
          margin={{ top: 6, right: 4, bottom: 0, left: 4 }}
        >
          <defs>
            <linearGradient id="rainFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="hour"
            tick={{ fill: "#5f6c83", fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis hide domain={[0, "dataMax + 8"]} />
          <Tooltip
            content={<RainTooltip />}
            cursor={{ stroke: "rgba(56,189,248,0.4)", strokeDasharray: "3 3" }}
          />
          <Area
            type="monotone"
            dataKey="mm"
            stroke="#38bdf8"
            strokeWidth={2}
            fill="url(#rainFill)"
            animationDuration={1100}
            dot={false}
            activeDot={{ r: 3, fill: "#38bdf8", stroke: "#0b1120" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
