import type { Severity } from "@/types";

/** Backend analysis lifecycle — see `LandslideAnalysisResponse.status` on the ml-service. */
export type LandslideAnalysisStatus =
  | "queued"
  | "preprocessing"
  | "running"
  | "postprocessing"
  | "completed"
  | "failed"
  | "cancelled";

/** Which pipeline produced a result. `mock` MUST always be surfaced in the UI —
 * never presented as a real AI prediction. */
export type LandslideAnalysisMode = "real" | "mock";

export interface LandslideDetection {
  id: string;
  /** GeoJSON Polygon geometry, WGS84. */
  geometry: GeoJSON.Geometry;
  areaM2: number;
  areaKm2: number;
  meanProbability: number;
  maxProbability: number;
  pixelFractionAboveThreshold: number;
  /** Mean model probability across this detection's pixels — model output
   * confidence, NOT a validated real-world accuracy figure. */
  confidence: number;
  /** Configurable classification, NOT an official hazard-severity standard. */
  severity: Severity;
  centroid: { lat: number; lon: number };
  model: string;
  modelVersion: string;
  detectedAt: string;
}

export interface LandslideAnalysisSummary {
  detections: number;
  affectedAreaKm2: number;
  critical: number;
  high: number;
  moderate: number;
  low: number;
}

export interface LandslideAnalysisResult {
  analysisId: string;
  status: LandslideAnalysisStatus;
  mode: LandslideAnalysisMode;
  modelName: string;
  modelVersion: string;
  error: string | null;
  errorCode: string | null;
  summary: LandslideAnalysisSummary | null;
  detections: LandslideDetection[];
  geojson: GeoJSON.FeatureCollection | null;
}

export interface LandslideHealth {
  available: boolean;
  loaded: boolean;
  device: string | null;
  model: string;
  version: string;
  inferenceMode: "real" | "mock";
  reason: string | null;
}
