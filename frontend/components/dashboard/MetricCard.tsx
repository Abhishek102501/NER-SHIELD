"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { LiveNumber } from "@/components/ui/LiveNumber";
import { SEVERITY, cn } from "@/lib/utils";
import type { SystemMetric } from "@/types";

interface MetricCardProps {
  metric: SystemMetric;
  index?: number;
  /** When provided, the value animates on every change (live telemetry). */
  liveValue?: number;
}

export function MetricCard({ metric, index = 0, liveValue }: MetricCardProps) {
  const sev = metric.severity ? SEVERITY[metric.severity] : null;
  const TrendIcon =
    metric.trend === "rising"
      ? ArrowUpRight
      : metric.trend === "falling"
        ? ArrowDownRight
        : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-white/8 bg-white/[0.02] p-3",
        "transition-colors hover:border-white/15 hover:bg-white/[0.04]",
      )}
    >
      {/* Severity edge */}
      <span
        className={cn(
          "absolute inset-y-2 left-0 w-0.5 rounded-full",
          sev ? sev.dot : "bg-white/20",
        )}
      />
      <div className="flex items-start justify-between gap-2 pl-2">
        <p className="eyebrow leading-tight">{metric.label}</p>
        {metric.trend && (
          <TrendIcon
            size={13}
            className={cn(sev ? sev.text : "text-fg-muted", "shrink-0")}
          />
        )}
      </div>
      <div className="mt-1.5 flex items-end justify-between gap-2 pl-2">
        {liveValue !== undefined ? (
          <LiveNumber
            value={liveValue}
            pad={2}
            className="numeric text-2xl font-semibold leading-none text-fg"
          />
        ) : (
          <AnimatedNumber
            value={metric.value}
            pad={2}
            className="numeric text-2xl font-semibold leading-none text-fg"
          />
        )}
        {metric.delta && (
          <span className="numeric text-[10px] text-fg-dim">{metric.delta}</span>
        )}
      </div>
    </motion.div>
  );
}
