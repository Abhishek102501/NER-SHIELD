"use client";

import { motion } from "framer-motion";

const SPARK_POINTS = "0,26 12,23 24,25 36,17 48,19 60,11 72,14 84,7 96,9 108,2";

/** Small rising sparkline, used by the Peak Risk Index card. */
export function SparklineGraph({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 112 32" className="h-9 w-24 overflow-visible">
      <motion.polyline
        points={SPARK_POINTS}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
      />
      <circle cx="108" cy="2" r="3" fill={color} />
      <circle cx="108" cy="2" r="5.5" fill={color} opacity={0.25} />
    </svg>
  );
}

/** Small proportional severity bar stack, used by the Active Alerts card. */
export function AlertBarsGraph({
  high,
  medium,
  low,
}: {
  high: number;
  medium: number;
  low: number;
}) {
  const total = Math.max(1, high + medium + low);
  const bars = [
    { count: high, color: "#ef4444" },
    { count: medium, color: "#eab308" },
    { count: low, color: "#38bdf8" },
  ];
  return (
    <div className="flex h-9 items-end gap-1">
      {bars.map((b, i) => (
        <motion.span
          key={i}
          className="w-2 rounded-sm"
          style={{ backgroundColor: b.color }}
          initial={{ height: 0 }}
          animate={{ height: `${Math.max(12, (b.count / total) * 100)}%` }}
          transition={{ duration: 0.7, delay: 0.6 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </div>
  );
}

/** Tiny highlighted-zone terrain glyph, used by the Critical Hazard Zones card. */
export function ZonesGraph() {
  const dots = [
    { cx: 18, cy: 20, r: 4, color: "#ef4444" },
    { cx: 46, cy: 10, r: 3, color: "#f97316" },
    { cx: 70, cy: 22, r: 3, color: "#eab308" },
  ];
  return (
    <svg viewBox="0 0 88 32" className="h-9 w-22 overflow-visible">
      <polyline
        points="0,30 14,18 28,24 44,8 58,20 72,12 88,26"
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1.5"
      />
      {dots.map((d, i) => (
        <motion.circle
          key={i}
          cx={d.cx}
          cy={d.cy}
          r={d.r}
          fill={d.color}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.7 + i * 0.12, ease: "easeOut" }}
        />
      ))}
    </svg>
  );
}
