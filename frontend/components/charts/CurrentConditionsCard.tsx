"use client";

import { CloudOff, Loader2, Thermometer, Wind } from "lucide-react";
import { useEffect, useState } from "react";
import { MAP_CENTER } from "@/data/geo";
import { getCurrentWeather } from "@/services/weather";
import type { CurrentWeather } from "@/types/weather";

type LoadState = "loading" | "loaded";

/**
 * Real current-conditions weather (temperature/humidity/wind/precipitation) via the
 * backend's Open-Meteo integration — a genuinely live external reading, distinct from the
 * `RAINFALL_SUMMARY`/`SOIL_MOISTURE` demonstration data in the section above it. No
 * fallback to fake values: an unreachable/unconfigured backend renders the explicit
 * "unavailable" state below, never a plausible-looking number.
 */
export function CurrentConditionsCard() {
  const [state, setState] = useState<LoadState>("loading");
  const [weather, setWeather] = useState<CurrentWeather | null>(null);

  useEffect(() => {
    let cancelled = false;
    const [longitude, latitude] = MAP_CENTER;
    getCurrentWeather(latitude, longitude).then((result) => {
      if (cancelled) return;
      setWeather(result);
      setState("loaded");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-3 text-[11px] text-fg-dim">
        <Loader2 size={14} className="animate-spin text-accent" />
        Checking live conditions…
      </div>
    );
  }

  if (!weather?.available) {
    return (
      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
        <div className="flex items-center gap-2 text-[11px] text-fg-dim">
          <CloudOff size={14} className="text-fg-dim" />
          Live conditions unavailable
        </div>
        {weather?.reason && <p className="mt-1 text-[10px] text-fg-dim">{weather.reason}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Thermometer size={16} className="text-accent" />
          <span className="numeric text-2xl font-semibold text-fg">
            {weather.temperatureCelsius != null ? Math.round(weather.temperatureCelsius) : "—"}
            <span className="ml-1 text-xs font-normal text-fg-muted">°C</span>
          </span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-sev-low/10 px-2 py-0.5 text-[10px] font-semibold text-sev-low">
          LIVE
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-white/[0.03] px-2.5 py-1.5">
          <p className="eyebrow">Humidity</p>
          <p className="numeric mt-0.5 text-sm font-semibold text-fg">
            {weather.relativeHumidityPercent ?? "—"}%
          </p>
        </div>
        <div className="rounded-lg bg-white/[0.03] px-2.5 py-1.5">
          <p className="eyebrow flex items-center gap-1">
            <Wind size={9} /> Wind
          </p>
          <p className="numeric mt-0.5 text-sm font-semibold text-fg">
            {weather.windSpeedKph ?? "—"} km/h
          </p>
        </div>
        <div className="rounded-lg bg-white/[0.03] px-2.5 py-1.5">
          <p className="eyebrow">Precip.</p>
          <p className="numeric mt-0.5 text-sm font-semibold text-fg">
            {weather.precipitationMm ?? "—"} mm
          </p>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-fg-dim">
        Source: {weather.source ?? weather.provider} ·{" "}
        {weather.fetchedAt ? new Date(weather.fetchedAt).toLocaleTimeString() : "—"}
      </p>
    </div>
  );
}
