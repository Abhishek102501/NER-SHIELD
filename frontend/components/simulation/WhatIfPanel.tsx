"use client";

import { motion } from "framer-motion";
import { ArrowRight, Home, RotateCcw, Route, Spline } from "lucide-react";
import { useEffect, useState } from "react";
import { LiveNumber } from "@/components/ui/LiveNumber";
import { predictRisk } from "@/services/risk";
import { getLocation } from "@/data/locations";
import type { WhatIfResult } from "@/types";
import { SEVERITY, cn } from "@/lib/utils";

export function WhatIfPanel({ locationId }: { locationId: string }) {
  const [rain, setRain] = useState(0);
  const [soil, setSoil] = useState(0);
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const base = getLocation(locationId).risk.value;

  useEffect(() => {
    let active = true;
    predictRisk(locationId, {
      rainfallDelta: rain,
      soilMoistureDelta: soil,
    }).then((r) => {
      if (active) setResult(r);
    });
    return () => {
      active = false;
    };
  }, [locationId, rain, soil]);

  const projected = result?.projectedRisk ?? base;
  const band = result?.band ?? getLocation(locationId).risk.band;
  const sev = SEVERITY[band];
  const delta = projected - base;
  const impact = result?.impact ?? { villages: 0, roads: 0, bridges: 0 };

  const reset = () => {
    setRain(0);
    setSoil(0);
  };

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="eyebrow mb-1 text-accent/70">What-If Scenario</p>
          <h3 className="text-sm font-semibold text-fg">
            Stress-test the forecast
          </h3>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-medium text-fg-muted transition-colors hover:bg-white/5 hover:text-fg"
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Controls */}
        <div className="space-y-5">
          <Slider
            label="Rainfall"
            value={rain}
            min={0}
            max={40}
            onChange={setRain}
          />
          <Slider
            label="Soil Moisture"
            value={soil}
            min={0}
            max={30}
            onChange={setSoil}
          />
        </div>

        {/* Outcome */}
        <div className="rounded-xl border border-white/8 bg-black/25 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Current</p>
              <span className="numeric text-2xl font-semibold text-fg-muted">
                {base}%
              </span>
            </div>
            <ArrowRight size={18} className="text-fg-dim" />
            <div className="text-right">
              <p className="eyebrow">Projected</p>
              <LiveNumber
                value={projected}
                suffix="%"
                className={cn("numeric text-3xl font-semibold", sev.text)}
              />
            </div>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
            <motion.div
              className={cn("h-full rounded-full", sev.dot)}
              animate={{ width: `${projected}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <p className="mt-2 text-[11px] text-fg-muted">
            {delta > 0 ? (
              <span className={sev.text}>▲ +{delta}% vs current forecast</span>
            ) : (
              <span className="text-fg-dim">At current forecast levels</span>
            )}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Impact icon={Home} value={impact.villages} label="Villages" />
            <Impact icon={Route} value={impact.roads} label="Roads" />
            <Impact icon={Spline} value={impact.bridges} label="Bridges" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[12px] text-fg-muted">{label}</span>
        <span className="numeric rounded-md bg-accent/10 px-2 py-0.5 text-[12px] font-semibold text-accent">
          +{value}%
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="ns-range w-full"
      />
    </div>
  );
}

function Impact({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Home;
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-white/[0.03] py-2.5">
      <Icon size={14} className="text-sev-high" />
      <LiveNumber
        value={value}
        className="numeric mt-1 text-lg font-semibold text-fg"
      />
      <span className="text-[9px] uppercase tracking-[0.1em] text-fg-dim">
        {label}
      </span>
    </div>
  );
}
