import type { RainfallPoint, Trend } from "@/types";

/** DEMONSTRATION weather readings — not live meteorological data. */
export const RAINFALL_24H: RainfallPoint[] = [
  { hour: "-24", mm: 6 },
  { hour: "-21", mm: 9 },
  { hour: "-18", mm: 14 },
  { hour: "-15", mm: 11 },
  { hour: "-12", mm: 19 },
  { hour: "-9", mm: 24 },
  { hour: "-6", mm: 21 },
  { hour: "-3", mm: 28 },
  { hour: "0", mm: 34 },
];

export const RAINFALL_SUMMARY = {
  current: 142,
  unit: "mm",
  window24h: 142,
  window72h: 287,
  intensity: "Heavy",
} as const;

export const SOIL_MOISTURE: {
  value: number;
  trend: Trend;
  trendLabel: string;
  threshold: number;
} = {
  value: 82,
  trend: "rising",
  trendLabel: "Rising",
  threshold: 70,
};
