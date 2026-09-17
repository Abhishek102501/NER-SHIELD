"use client";

import { Activity, AlertTriangle, Mountain, Play, PlusCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useCommand } from "@/lib/command-context";
import { cn } from "@/lib/utils";
import type { LandslideDetection } from "@/types/landslide";

const SEVERITY_TEXT: Record<string, string> = {
  low: "text-sev-low",
  moderate: "text-sev-moderate",
  high: "text-sev-high",
  critical: "text-sev-critical",
};

const SEVERITY_BG: Record<string, string> = {
  low: "border-sev-low/30 bg-sev-low/[0.06]",
  moderate: "border-sev-moderate/30 bg-sev-moderate/[0.06]",
  high: "border-sev-high/30 bg-sev-high/[0.06]",
  critical: "border-sev-critical/30 bg-sev-critical/[0.06]",
};

export function LandslideAnalysisModal() {
  const {
    landslideModalOpen,
    closeLandslideModal,
    landslideAnalysis,
    landslidePending,
    landslideError,
    runLandslideDemoAnalysis,
    selectedLandslideDetectionId,
    selectLandslideDetection,
    createIncident,
    permissions,
  } = useCommand();

  const status = landslideAnalysis?.status;
  const isRunning =
    landslidePending || status === "queued" || status === "preprocessing" || status === "running";

  const handleCreateIncident = (detection: LandslideDetection) => {
    createIncident({
      severity: detection.severity,
      category: "Landslide (AI Detected)",
      location: `${detection.centroid.lat.toFixed(4)}, ${detection.centroid.lon.toFixed(4)}`,
      lngLat: [detection.centroid.lon, detection.centroid.lat],
      description: `Landslide4Sense AI detected a ${detection.areaKm2.toFixed(2)} km² landslide zone (confidence ${(detection.confidence * 100).toFixed(0)}%).`,
      source: `Landslide4Sense AI (${landslideAnalysis?.mode === "mock" ? "mock mode" : "model"} ${detection.modelVersion})`,
    });
  };

  return (
    <Modal
      open={landslideModalOpen}
      onClose={closeLandslideModal}
      eyebrow="AI Geospatial Analysis"
      title="Landslide AI Analysis"
      icon={<Mountain size={17} />}
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-fg-dim">
            {landslideAnalysis?.mode === "mock"
              ? "MOCK MODE — deterministic placeholder pipeline, not a real AI prediction"
              : landslideAnalysis?.mode === "real"
                ? "REAL MODEL — Landslide4Sense U-Net inference"
                : "Runs the real geospatial pipeline (validation → preprocessing → tiling → inference → polygonization) against a demo scene"}
          </span>
          <button
            onClick={runLandslideDemoAnalysis}
            disabled={isRunning}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[12px] font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isRunning ? (
              <>
                <Activity size={13} className="animate-spin" /> Analyzing…
              </>
            ) : (
              <>
                <Play size={13} /> Run Demo Analysis
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {landslideError && (
          <div className="flex items-start gap-2 rounded-lg border border-sev-critical/30 bg-sev-critical/[0.06] px-3 py-2 text-[12px] text-sev-critical">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{landslideError}</span>
          </div>
        )}

        {!landslideAnalysis && !landslideError && (
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 text-[12px] text-fg-muted">
            Runs the Landslide4Sense U-Net segmentation model against a 14-channel
            (12 Sentinel-2 bands + Slope + DEM) scene. No real checkpoint is
            configured in this environment — <b>Run Demo Analysis</b> exercises the
            full real pipeline (validation, tiling, inference dispatch, mask
            cleanup, georeferenced polygonization) against a clearly-labeled
            synthetic demo scene.
          </div>
        )}

        {landslideAnalysis?.status === "failed" && (
          <div className="rounded-lg border border-sev-critical/30 bg-sev-critical/[0.06] px-3 py-3 text-[12px] text-fg-muted">
            <p className="mb-1 font-semibold text-sev-critical">Analysis failed</p>
            <p>{landslideAnalysis.error ?? "Unknown error."}</p>
            {landslideAnalysis.errorCode && (
              <p className="mt-1 text-fg-dim">Code: {landslideAnalysis.errorCode}</p>
            )}
          </div>
        )}

        {isRunning && (
          <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/[0.06] px-3 py-2 text-[12px] text-fg-muted">
            <Activity size={14} className="animate-spin text-accent" />
            <span>
              Status: <span className="font-semibold text-accent">{status ?? "starting"}</span>
            </span>
          </div>
        )}

        {landslideAnalysis?.status === "completed" && landslideAnalysis.summary && (
          <>
            <div
              className={cn(
                "rounded-lg border px-3 py-2 text-[11px]",
                landslideAnalysis.mode === "mock"
                  ? "border-sev-moderate/30 bg-sev-moderate/[0.06] text-sev-moderate"
                  : "border-sev-low/30 bg-sev-low/[0.06] text-sev-low",
              )}
            >
              <span className="font-bold uppercase tracking-wider">
                {landslideAnalysis.mode === "mock" ? "Mock Result" : "Real Model Result"}
              </span>
              {" — "}
              {landslideAnalysis.modelName} {landslideAnalysis.modelVersion}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Stat label="Detections" value={String(landslideAnalysis.summary.detections)} />
              <Stat
                label="Affected Area"
                value={`${landslideAnalysis.summary.affectedAreaKm2.toFixed(2)} km²`}
              />
              <Stat label="Critical" value={String(landslideAnalysis.summary.critical)} accent="critical" />
              <Stat label="High" value={String(landslideAnalysis.summary.high)} accent="high" />
              <Stat label="Moderate" value={String(landslideAnalysis.summary.moderate)} accent="moderate" />
              <Stat label="Low" value={String(landslideAnalysis.summary.low)} accent="low" />
            </div>

            <div>
              <p className="eyebrow mb-2">Detections</p>
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {landslideAnalysis.detections.length === 0 && (
                  <p className="text-[12px] text-fg-muted">No landslide zones detected in this scene.</p>
                )}
                {landslideAnalysis.detections.map((d) => (
                  <div
                    key={d.id}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      selectLandslideDetection(d.id === selectedLandslideDetectionId ? null : d.id)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectLandslideDetection(d.id === selectedLandslideDetectionId ? null : d.id);
                      }
                    }}
                    className={cn(
                      "w-full cursor-pointer rounded-lg border px-3 py-2.5 text-left transition-colors",
                      d.id === selectedLandslideDetectionId
                        ? SEVERITY_BG[d.severity]
                        : "border-white/8 bg-white/[0.02] hover:border-white/20",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-fg-muted">{d.id}</span>
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          SEVERITY_TEXT[d.severity],
                        )}
                      >
                        {d.severity}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[12px] text-fg">
                      <span>{d.areaKm2.toFixed(2)} km²</span>
                      <span className="numeric text-fg-muted">
                        confidence {(d.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    {d.id === selectedLandslideDetectionId && (
                      <div className="mt-2 space-y-1.5 border-t border-white/8 pt-2 text-[11px] text-fg-muted">
                        <p>
                          Centroid: {d.centroid.lat.toFixed(4)}, {d.centroid.lon.toFixed(4)}
                        </p>
                        <p>Max probability: {(d.maxProbability * 100).toFixed(0)}%</p>
                        <p>Detected: {new Date(d.detectedAt).toLocaleString()}</p>
                        {permissions.createIncident && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCreateIncident(d);
                            }}
                            className="mt-1 flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/20"
                          >
                            <PlusCircle size={12} /> Create Incident
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "low" | "moderate" | "high" | "critical";
}) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
      <p className="numeric text-lg font-semibold text-fg">
        <span className={accent ? SEVERITY_TEXT[accent] : undefined}>{value}</span>
      </p>
      <p className="text-[10px] uppercase tracking-wide text-fg-dim">{label}</p>
    </div>
  );
}
