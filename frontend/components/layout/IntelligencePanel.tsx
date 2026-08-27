"use client";

import { motion } from "framer-motion";
import { CloudRain, Droplets, PanelRightClose, TrendingUp } from "lucide-react";
import { WeatherChart } from "@/components/charts/WeatherChart";
import { ImpactSummary } from "@/components/risk/ImpactSummary";
import { RiskFactors } from "@/components/risk/RiskFactors";
import { RiskScore } from "@/components/risk/RiskScore";
import { RAINFALL_SUMMARY, SOIL_MOISTURE } from "@/data/weather";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <span className="eyebrow">{children}</span>
      <span className="h-px flex-1 bg-white/8" />
    </div>
  );
}

export function IntelligencePanel({ onCollapse }: { onCollapse: () => void }) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-4 py-3">
        <div>
          <h2 className="text-[13px] font-bold tracking-wide text-fg">
            AI Risk Engine
          </h2>
          <p className="eyebrow mt-1">Predictive Intelligence</p>
        </div>
        <button
          onClick={onCollapse}
          aria-label="Collapse intelligence panel"
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-fg-muted transition-colors hover:bg-white/5 hover:text-fg"
        >
          <PanelRightClose size={15} />
        </button>
      </div>

      {/* Scroll body */}
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {/* Score */}
        <RiskScore />

        {/* Risk factors */}
        <section>
          <SectionLabel>Risk Factors</SectionLabel>
          <RiskFactors />
        </section>

        {/* Weather */}
        <section>
          <SectionLabel>Weather · Rainfall</SectionLabel>
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
            <div className="mb-1 flex items-end justify-between">
              <div className="flex items-center gap-2">
                <CloudRain size={16} className="text-accent" />
                <span className="numeric text-2xl font-semibold text-fg">
                  {RAINFALL_SUMMARY.current}
                  <span className="ml-1 text-xs font-normal text-fg-muted">
                    {RAINFALL_SUMMARY.unit}
                  </span>
                </span>
              </div>
              <span className="rounded-full bg-sev-high/10 px-2 py-0.5 text-[10px] font-semibold text-sev-high">
                {RAINFALL_SUMMARY.intensity}
              </span>
            </div>
            <WeatherChart />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                <p className="eyebrow">24H</p>
                <p className="numeric mt-0.5 text-sm font-semibold text-fg">
                  {RAINFALL_SUMMARY.window24h} mm
                </p>
              </div>
              <div className="rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                <p className="eyebrow">72H</p>
                <p className="numeric mt-0.5 text-sm font-semibold text-fg">
                  {RAINFALL_SUMMARY.window72h} mm
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Soil moisture */}
        <section>
          <SectionLabel>Soil Moisture</SectionLabel>
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets size={16} className="text-accent" />
                <span className="numeric text-2xl font-semibold text-fg">
                  {SOIL_MOISTURE.value}%
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sev-high">
                <TrendingUp size={13} />
                {SOIL_MOISTURE.trendLabel}
              </span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-white/8">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-accent to-sev-high"
                initial={{ width: 0 }}
                animate={{ width: `${SOIL_MOISTURE.value}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
              {/* Threshold marker */}
              <span
                className="absolute inset-y-0 w-px bg-white/60"
                style={{ left: `${SOIL_MOISTURE.threshold}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] text-fg-dim">
              Saturation threshold {SOIL_MOISTURE.threshold}% · currently exceeded
            </p>
          </div>
        </section>

        {/* Impact */}
        <section>
          <SectionLabel>Potential Impact</SectionLabel>
          <ImpactSummary />
        </section>
      </div>
    </div>
  );
}
