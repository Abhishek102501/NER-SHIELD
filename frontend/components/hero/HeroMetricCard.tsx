"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface HeroMetricCardProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  meta: ReactNode;
  graph: ReactNode;
  index?: number;
}

export function HeroMetricCard({ icon, label, value, meta, graph, index = 0 }: HeroMetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.55 + index * 0.08 }}
      whileHover={{ y: -4 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] p-5",
        "transition-[border-color,background-color,box-shadow] duration-300",
        "hover:border-accent/30 hover:bg-white/[0.03] hover:shadow-[0_0_0_1px_rgba(34,211,238,0.12),0_20px_44px_-24px_rgba(34,211,238,0.35)]",
      )}
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-fg-dim">
          {icon}
          <span className="caption-mono">{label}</span>
        </div>
        {graph}
      </div>
      <div className="mt-3">{value}</div>
      <div className="mt-1.5">{meta}</div>
    </motion.div>
  );
}
