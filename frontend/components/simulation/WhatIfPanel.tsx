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
    <div className="card-marketing p-6 bg-canvas">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <span className="caption-mono text-mute mb-1 block">WHAT-IF SCENARIO</span>
          <h3 className="body-md font-semibold text-ink">
            Stress-test the forecast
          </h3>
        </div>
        <button
          onClick={reset}
          className="button-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
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
        <div className="rounded-lg border border-hairline bg-canvas-soft-2 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="caption-mono text-mute block mb-1">CURRENT</span>
              <span className="numeric text-2xl font-semibold text-body">
                {base}%
              </span>
            </div>
            <ArrowRight size={18} className="text-mute" />
            <div className="text-right">
              <span className="caption-mono text-mute block mb-1">PROJECTED</span>
              <LiveNumber
                value={projected}
                suffix="%"
                className={cn("numeric text-3xl font-semibold", sev.text)}
              />
            </div>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-canvas border border-hairline">
            <motion.div
              className={cn("h-full rounded-full", sev.dot)}
              animate={{ width: `${projected}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <p className="mt-2 body-sm text-body">
            {delta > 0 ? (
              <span className={sev.text}>▲ +{delta}% vs current forecast</span>
            ) : (
              <span className="text-mute">At current forecast levels</span>
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
      <div className="mb-2 flex items-center justify-between body-sm">
        <span className="text-body font-medium">{label}</span>
        <span className="numeric rounded-full bg-canvas-soft-2 border border-hairline px-2.5 py-0.5 caption-mono text-ink">
          +{value}%
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="ns-range w-full cursor-pointer accent-primary"
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
    <div className="flex flex-col items-center rounded-md border border-hairline bg-canvas p-3">
      <Icon size={14} className="text-warning mb-1" />
      <LiveNumber
        value={value}
        className="numeric text-lg font-semibold text-ink"
      />
      <span className="caption-mono text-[9px] text-mute">
        {label}
      </span>
    </div>
  );
}

