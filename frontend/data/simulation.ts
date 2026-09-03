import type { Severity } from "@/types";

/**
 * DEMO / SIMULATED — parameters for the What-If & Simulation interfaces.
 * These are demonstration heuristics, NOT a validated physical model.
 */
export const SCENARIOS = [
  { id: "rainfall", label: "Rainfall Surge" },
  { id: "cloudburst", label: "Cloudburst" },
  { id: "seismic", label: "Seismic Trigger" },
  { id: "custom", label: "Custom" },
] as const;

export type ScenarioId = (typeof SCENARIOS)[number]["id"];

/** Slider bounds for the what-if controls. */
export const WHATIF_LIMITS = {
  rainfall: { min: 0, max: 40, unit: "%" },
  soilMoisture: { min: 0, max: 30, unit: "%" },
  slope: { min: 0, max: 20, unit: "%" },
} as const;

/** Weight each adjustable condition contributes to the projected risk delta. */
export const SIM_WEIGHTS = {
  rainfall: 0.42,
  soilMoisture: 0.28,
  slope: 0.18,
} as const;

export function bandForRisk(value: number): Severity {
  if (value >= 85) return "critical";
  if (value >= 70) return "high";
  if (value >= 50) return "moderate";
  return "low";
}

export function responsePriorityForRisk(
  value: number,
): { label: string; severity: Severity } {
  if (value >= 85) return { label: "P1 · Immediate", severity: "critical" };
  if (value >= 70) return { label: "P2 · Urgent", severity: "high" };
  if (value >= 50) return { label: "P3 · Elevated", severity: "moderate" };
  return { label: "P4 · Routine", severity: "low" };
}
