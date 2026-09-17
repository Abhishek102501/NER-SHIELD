"use client";

import { CloudRain, HelpCircle, Play, TriangleAlert } from "lucide-react";
import { useCommand } from "@/lib/command-context";
import { SEVERITY, cn } from "@/lib/utils";

/** Compact North East India rainfall LSTM forecast card for the Operations
 * panel — mirrors the "Landslide AI" KPI block's density and typography. */
export function RainfallForecastPanel() {
  const {
    rainfallForecast,
    rainfallPending,
    rainfallError,
    runRainfallForecast,
    rainfallExplanation,
    rainfallExplanationPending,
    rainfallExplanationError,
    explainRainfallForecast,
  } = useCommand();

  const maxMm = Math.max(1, ...(rainfallForecast?.forecast.map((p) => p.rainfallMm) ?? [1]));
  const weakSkill =
    rainfallForecast?.mode === "real" &&
    rainfallForecast.trainingMetrics?.meanCorrScaled !== null &&
    rainfallForecast.trainingMetrics !== null &&
    rainfallForecast.trainingMetrics.meanCorrScaled! < 0.15;

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <p className="eyebrow flex items-center gap-1.5">
          <CloudRain size={11} /> North East Rainfall Forecast
        </p>
        <span
          className={cn(
            "flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em]",
            rainfallForecast ? "text-sev-low" : "text-fg-dim",
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", rainfallForecast ? "bg-sev-low" : "bg-fg-dim")} />
          {rainfallForecast ? "Model Ready" : "Not Run"}
        </span>
      </div>

      {rainfallError && (
        <p className="mb-2 rounded-lg border border-sev-critical/30 bg-sev-critical/[0.06] px-2.5 py-1.5 text-[11px] text-sev-critical">
          {rainfallError}
        </p>
      )}

      {!rainfallForecast && !rainfallError && (
        <p className="mb-2 text-[11px] text-fg-muted">
          LSTM forecast for Guwahati (North East India station), 12h lookback → next 12h at hourly steps.
        </p>
      )}

      {weakSkill && (
        <p className="mb-2 flex items-start gap-1.5 rounded-lg border border-sev-moderate/30 bg-sev-moderate/[0.06] px-2.5 py-1.5 text-[10px] text-sev-moderate">
          <TriangleAlert size={12} className="mt-0.5 shrink-0" />
          Loaded checkpoint has no measured skill (mean correlation{" "}
          {rainfallForecast?.trainingMetrics?.meanCorrScaled?.toFixed(2)}) — treat this forecast as
          unvalidated, not a production prediction.
        </p>
      )}

      {rainfallForecast && (
        <div className="mb-2 space-y-1">
          <div
            className={cn(
              "mb-1.5 inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
              rainfallForecast.mode === "demo"
                ? "bg-sev-moderate/15 text-sev-moderate"
                : "bg-sev-low/15 text-sev-low",
            )}
          >
            {rainfallForecast.mode === "demo" ? "Demo / Simulated" : "Real LSTM"} · {rainfallForecast.station}
          </div>
          {rainfallForecast.confidenceAvailable && rainfallForecast.confidence !== null && (
            <p className="mb-1.5 text-[10px] text-fg-muted">
              Ensemble confidence{" "}
              <span className="numeric font-semibold text-fg">
                {Math.round(rainfallForecast.confidence * 100)}%
              </span>{" "}
              — agreement between the LSTM and XGBoost co-forecasters
            </p>
          )}
          {rainfallForecast.forecast.map((p) => {
            const pct = Math.max(4, Math.round((p.rainfallMm / maxMm) * 100));
            const time = new Date(p.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
            return (
              <div key={p.timestamp} className="flex items-center gap-2 text-[11px]">
                <span className="numeric w-10 shrink-0 text-fg-dim">{time}</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/[0.04]">
                  <span
                    className={cn("block h-full rounded-full", SEVERITY[p.severity].dot)}
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="numeric w-14 shrink-0 text-right text-fg">{p.rainfallMm.toFixed(1)} mm</span>
              </div>
            );
          })}
        </div>
      )}

      {rainfallExplanationError && (
        <p className="mb-2 rounded-lg border border-sev-critical/30 bg-sev-critical/[0.06] px-2.5 py-1.5 text-[11px] text-sev-critical">
          {rainfallExplanationError}
        </p>
      )}

      {rainfallExplanation && (
        <div className="mb-2 rounded-lg border border-white/8 bg-white/[0.02] p-2.5">
          <p className="eyebrow mb-1.5 flex items-center gap-1.5 text-accent/70">
            <HelpCircle size={10} /> Why +{rainfallExplanation.leadTimeMin}min: {rainfallExplanation.predictionMm.toFixed(2)} mm
          </p>
          <div className="space-y-1">
            {rainfallExplanation.contributions.slice(0, 4).map((c) => (
              <div key={c.feature} className="flex items-center justify-between gap-2 text-[10px]">
                <span className="truncate text-fg-muted">{c.feature}</span>
                <span
                  className={cn(
                    "numeric shrink-0 font-semibold",
                    c.direction === "increased" ? "text-sev-critical" : "text-sev-low",
                  )}
                >
                  {c.effectMm > 0 ? "+" : ""}
                  {c.effectMm.toFixed(2)} mm
                </span>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[9px] text-fg-dim">
            Per-feature mm effects don&apos;t sum to the forecast (SHAP is exact only in the model&apos;s
            own scaled output space) — see additivity_error in the raw response.
          </p>
        </div>
      )}

      <div className="flex gap-1.5">
        <button
          onClick={runRainfallForecast}
          disabled={rainfallPending}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/20 disabled:opacity-60"
        >
          <Play size={11} /> {rainfallPending ? "Forecasting…" : "Run Rainfall Forecast"}
        </button>
        {rainfallForecast && rainfallForecast.mode === "real" && (
          <button
            onClick={explainRainfallForecast}
            disabled={rainfallExplanationPending}
            title="Explain the +60min forecast (SHAP, XGBoost only)"
            className="flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-semibold text-fg-muted transition-colors hover:bg-white/[0.06] disabled:opacity-60"
          >
            <HelpCircle size={11} /> {rainfallExplanationPending ? "…" : "Why?"}
          </button>
        )}
      </div>
    </div>
  );
}
