import type { Severity } from "@/types";

/** Minimal className joiner (no external deps). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Severity → design-system presentation tokens. */
export const SEVERITY: Record<
  Severity,
  {
    label: string;
    hex: string;
    text: string;
    bgSoft: string;
    border: string;
    dot: string;
  }
> = {
  low: {
    label: "Low",
    hex: "#22c55e",
    text: "text-sev-low",
    bgSoft: "bg-sev-low/10",
    border: "border-sev-low/30",
    dot: "bg-sev-low",
  },
  moderate: {
    label: "Moderate",
    hex: "#eab308",
    text: "text-sev-moderate",
    bgSoft: "bg-sev-moderate/10",
    border: "border-sev-moderate/30",
    dot: "bg-sev-moderate",
  },
  high: {
    label: "High",
    hex: "#f97316",
    text: "text-sev-high",
    bgSoft: "bg-sev-high/10",
    border: "border-sev-high/30",
    dot: "bg-sev-high",
  },
  critical: {
    label: "Critical",
    hex: "#ef4444",
    text: "text-sev-critical",
    bgSoft: "bg-sev-critical/10",
    border: "border-sev-critical/40",
    dot: "bg-sev-critical",
  },
};

/** Pad an integer to two digits (metric displays). */
export function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}
