"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { SEVERITY, cn } from "@/lib/utils";
import type { Incident } from "@/types";

interface AlertItemProps {
  incident: Incident;
  selected: boolean;
  onSelect: () => void;
  index?: number;
}

export function AlertItem({
  incident,
  selected,
  onSelect,
  index = 0,
}: AlertItemProps) {
  const sev = SEVERITY[incident.severity];
  const isCritical = incident.severity === "critical";

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.04 * index, duration: 0.3, ease: "easeOut" }}
      whileHover={{ x: 2 }}
      className={cn(
        "group relative w-full overflow-hidden rounded-lg border px-3 py-2.5 text-left transition-colors",
        selected
          ? cn("border-white/20 bg-white/[0.06]", sev.border)
          : "border-white/8 bg-white/[0.015] hover:border-white/15 hover:bg-white/[0.04]",
      )}
    >
      {/* Severity rail */}
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          sev.dot,
          isCritical && "crit-pulse",
        )}
      />
      <div className="flex items-center justify-between gap-2 pl-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em]",
            sev.text,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", sev.dot)} />
          {sev.label}
        </span>
        <span className="numeric text-[10px] text-fg-dim">
          {incident.timeAgo}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 pl-1.5">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-fg">
            {incident.location}
          </p>
          <p className="truncate text-[11px] text-fg-muted">{incident.title}</p>
        </div>
        <ChevronRight
          size={15}
          className={cn(
            "shrink-0 text-fg-dim transition-transform group-hover:translate-x-0.5",
            selected && "text-fg-muted",
          )}
        />
      </div>
    </motion.button>
  );
}
