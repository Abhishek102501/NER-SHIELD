"use client";

import { motion } from "framer-motion";
import { HeartPulse, Home, Route, Spline, type LucideIcon } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { IMPACT_ITEMS } from "@/data/risk";
import type { ImpactItem } from "@/types";

const ICONS: Record<ImpactItem["icon"], LucideIcon> = {
  village: Home,
  road: Route,
  bridge: Spline,
  hospital: HeartPulse,
};

export function ImpactSummary() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {IMPACT_ITEMS.map((item, i) => {
        const Icon = ICONS[item.icon];
        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.06 * i, duration: 0.3, ease: "easeOut" }}
            className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-2"
          >
            <span className="grid h-8 w-8 place-items-center rounded-md border border-sev-high/25 bg-sev-high/10 text-sev-high">
              <Icon size={15} />
            </span>
            <div className="min-w-0">
              <AnimatedNumber
                value={item.count}
                className="numeric block text-lg font-semibold leading-none text-fg"
              />
              <span className="text-[10px] uppercase tracking-[0.1em] text-fg-dim">
                {item.label}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
