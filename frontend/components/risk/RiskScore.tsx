"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { RISK_SCORE } from "@/data/risk";
import { SEVERITY, cn } from "@/lib/utils";

const R = 52;
const CIRC = 2 * Math.PI * R;

export function RiskScore() {
  const s = RISK_SCORE;
  const sev = SEVERITY[s.band];
  const Trend = s.deltaDirection === "up" ? TrendingUp : TrendingDown;
  const dash = CIRC * (1 - s.value / 100);

  return (
    <div className="flex items-center gap-4">
      {/* Gauge */}
      <div className="relative h-[128px] w-[128px] shrink-0">
        <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
          <circle
            cx="64"
            cy="64"
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="8"
          />
          <motion.circle
            cx="64"
            cy="64"
            r={R}
            fill="none"
            stroke={sev.hex}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            initial={{ strokeDashoffset: CIRC }}
            animate={{ strokeDashoffset: dash }}
            transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ filter: `drop-shadow(0 0 6px ${sev.hex}66)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatedNumber
            value={s.value}
            decimals={1}
            suffix="%"
            className="numeric text-[26px] font-semibold leading-none text-fg"
          />
          <span
            className={cn(
              "mt-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]",
              sev.bgSoft,
              sev.text,
              s.band === "critical" && "crit-pulse",
            )}
          >
            {s.bandLabel}
          </span>
        </div>
      </div>

      {/* Meta */}
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div>
          <p className="eyebrow mb-1">6-Hour Trend</p>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-sm font-semibold",
              sev.text,
            )}
          >
            <Trend size={15} />
            <span className="numeric">{s.deltaLabel}</span>
          </span>
        </div>
        <div>
          <p className="eyebrow mb-1">Model Confidence</p>
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
              <motion.div
                className="h-full rounded-full bg-accent"
                initial={{ width: 0 }}
                animate={{ width: `${s.confidence}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
              />
            </div>
            <span className="numeric text-xs font-medium text-fg">
              {s.confidence}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
