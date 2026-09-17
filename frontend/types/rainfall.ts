import type { Severity } from "@/types";

export type RainfallForecastMode = "real" | "demo";

export interface RainfallForecastPoint {
  timestamp: string;
  rainfallMm: number;
  severity: Severity;
}

export interface TrainingMetrics {
  meanCorrScaled: number | null;
  meanCorrMm: number | null;
}

export interface RainfallForecastResult {
  model: string;
  modelVersion: string;
  mode: RainfallForecastMode;
  station: string;
  geographicScope: string;
  /** Always false for this model: trained only on North East India stations. */
  isGeneralized: boolean;
  horizonHours: number;
  intervalMinutes: number;
  generatedAt: string;
  forecast: RainfallForecastPoint[];
  confidence: number | null;
  confidenceAvailable: boolean;
  /** Measured skill of the loaded checkpoint (mode=real only) — null in demo mode.
   * Always shown alongside a real forecast so a weak/unvalidated checkpoint is
   * never presented without its own numbers. */
  trainingMetrics: TrainingMetrics | null;
  error: string | null;
  errorCode: string | null;
}

export interface FeatureContribution {
  feature: string;
  value: number;
  shapScaled: number;
  effectMm: number;
  direction: "increased" | "decreased" | "no effect";
}

export interface RainfallExplanation {
  horizon: number;
  leadTimeMin: number;
  predictionMm: number;
  baseMm: number;
  additivityError: number;
  unitsNote: string;
  narrative: string;
  contributions: FeatureContribution[];
}

export interface RainfallHealth {
  available: boolean;
  loaded: boolean;
  device: string | null;
  model: string;
  modelVersion: string;
  inferenceMode: "real" | "demo";
  reason: string | null;
  supportedStations: string[];
  trainingMetrics: TrainingMetrics | null;
}
