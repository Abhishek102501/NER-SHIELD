"use client";

import dynamic from "next/dynamic";
import { Crosshair, Loader2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { ZoneDetailPanel } from "@/components/map/ZoneDetailPanel";
import type { LiveMapApi } from "@/components/map/LiveMap";
import { mappableTimelineEvents, TIMELINE_EVENTS } from "@/data/timeline";
import { useCommand } from "@/lib/command-context";
import type { RiskZone } from "@/types";

const LiveMap = dynamic(() => import("@/components/map/LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#060a14] text-fg-dim">
      <Loader2 size={20} className="animate-spin" />
    </div>
  ),
});

// Every intelligence event with real coordinates — never fabricated for ones without.
const MAP_EVENTS = mappableTimelineEvents(TIMELINE_EVENTS);

/** The GIS map inside the command center — real MapLibre, wired to the layer control. */
export function CommandMap() {
  const { layers, selectedEventId, selectEvent } = useCommand();
  const [zone, setZone] = useState<RiskZone | null>(null);
  const apiRef = useRef<LiveMapApi | null>(null);

  // Command Center layer toggles map straight onto LiveMap's layer keys — see
  // data/layers.ts for the catalogue and LiveMap.tsx for what each one drives.
  const liveLayers = useMemo(
    () => ({
      "risk-zones": layers["risk-zones"] !== false,
      rainfall: true,
      roads: layers["roads"] !== false,
      rivers: layers["rivers"] !== false,
      villages: layers["villages"] !== false,
      schools: layers["villages"] !== false,
      "terrain-3d": layers["terrain-3d"] !== false,
      labels: layers["labels"] !== false,
      "critical-incidents": layers["critical-incidents"] !== false,
      "high-incidents": layers["high-incidents"] !== false,
      "moderate-incidents": layers["moderate-incidents"] !== false,
      "low-incidents": layers["low-incidents"] !== false,
      sensors: layers["sensors"] !== false,
    }),
    [layers],
  );

  return (
    <div className="absolute inset-0">
      <LiveMap
        className="h-full w-full"
        layers={liveLayers}
        onZoneSelect={setZone}
        selectedZoneId={zone?.id ?? null}
        events={MAP_EVENTS}
        selectedEventId={selectedEventId}
        onEventSelect={selectEvent}
        onReady={(api) => {
          apiRef.current = api;
        }}
      />

      {/* Recenter control */}
      <button
        onClick={() => apiRef.current?.reset()}
        aria-label="Recenter map"
        title="Recenter on region"
        className="glass-float absolute right-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-fg-muted transition-colors hover:text-accent"
      >
        <Crosshair size={16} />
      </button>

      <ZoneDetailPanel
        zone={zone}
        onClose={() => setZone(null)}
        onFocus={(d) => apiRef.current?.flyTo(d.center, 11)}
        focusLabel="Zoom to zone"
      />
    </div>
  );
}
