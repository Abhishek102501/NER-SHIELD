"use client";

import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  label: string;
  online?: boolean;
  className?: string;
  /** Visual size of the label text. */
  compact?: boolean;
}

/** Pulsing status dot + label, e.g. "● SYSTEM ONLINE". */
export function StatusIndicator({
  label,
  online = true,
  className,
  compact = false,
}: StatusIndicatorProps) {
  const color = online ? "text-sev-low" : "text-sev-critical";
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className={cn("relative grid h-2 w-2 place-items-center", color)}>
        <span
          className={cn(
            "pulse-ring absolute inset-0 rounded-full",
            online ? "bg-sev-low/70" : "bg-sev-critical/70",
          )}
        />
        <span
          className={cn(
            "relative h-2 w-2 rounded-full",
            online ? "bg-sev-low" : "bg-sev-critical",
          )}
        />
      </span>
      <span
        className={cn(
          "font-semibold uppercase tracking-[0.14em] text-fg",
          compact ? "text-[10px]" : "text-[11px]",
        )}
      >
        {label}
      </span>
    </span>
  );
}
