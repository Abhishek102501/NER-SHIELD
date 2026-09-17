"use client";

import dynamic from "next/dynamic";
import { Crosshair, Loader2, Maximize, Minimize } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LayerControl } from "@/components/map/LayerControl";
import { MapSearch } from "@/components/map/MapSearch";
import { PrimaryActions } from "@/components/map/PrimaryActions";
import { ZoneDetailPanel } from "@/components/map/ZoneDetailPanel";
import type { LiveMapApi } from "@/components/map/LiveMap";
import { mappableTimelineEvents, TIMELINE_EVENTS } from "@/data/timeline";
import { useCommand } from "@/lib/command-context";
import type { RiskZone } from "@/types";

const LiveMap = dynamic(() => import("@/components/map/LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#eef1ec] text-slate-400">
      <Loader2 size={20} className="animate-spin" />
    </div>
  ),
});

// Every intelligence event with real coordinates — never fabricated for ones without.
const MAP_EVENTS = mappableTimelineEvents(TIMELINE_EVENTS);

/** The GIS map inside the command center — real MapLibre, wired to the layer control. */
export function CommandMap() {
  const {
    layers,
    selectedEventId,
    selectEvent,
    incidents,
    selectedIncidentId,
    selectIncident,
    landslideAnalysis,
    selectedLandslideDetectionId,
    selectLandslideDetection,
  } = useCommand();
  const [zone, setZone] = useState<RiskZone | null>(null);
  const apiRef = useRef<LiveMapApi | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Selecting an incident in the sidebar (or a future incident-search result)
  // flies the map to it — previously incidents had no map-sync at all.
  useEffect(() => {
    if (!selectedIncidentId) return;
    const incident = incidents.find((i) => i.id === selectedIncidentId);
    if (incident?.lngLat) {
      apiRef.current?.flyTo(incident.lngLat, 12);
    }
  }, [selectedIncidentId, incidents]);

  // Same pattern as incident selection above — picking a detection in the
  // Landslide AI modal previously only highlighted it on the map if it
  // already happened to be in view (setFilter on landslide-detections-
  // highlight), with no way to actually get there.
  useEffect(() => {
    if (!selectedLandslideDetectionId) return;
    const detection = landslideAnalysis?.detections.find(
      (d) => d.id === selectedLandslideDetectionId,
    );
    if (detection?.centroid) {
      apiRef.current?.flyTo([detection.centroid.lon, detection.centroid.lat], 12);
    }
  }, [selectedLandslideDetectionId, landslideAnalysis]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === wrapperRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      wrapperRef.current?.requestFullscreen();
    }
  }

  // Command Center layer toggles map straight onto LiveMap's layer keys — see
  // data/layers.ts for the catalogue and LiveMap.tsx for what each one drives.
  const liveLayers = useMemo(
    () => ({
      "risk-zones": layers["risk-zones"] !== false,
      "hazard-landslide": layers["hazard-landslide"] !== false,
      "hazard-flood": layers["hazard-flood"] !== false,
      rainfall: true,
      roads: layers["roads"] !== false,
      "evacuation-routes": layers["evacuation-routes"] !== false,
      bridges: layers["bridges"] !== false,
      rivers: layers["rivers"] !== false,
      villages: layers["villages"] !== false,
      schools: layers["schools"] !== false,
      "terrain-3d": layers["terrain-3d"] !== false,
      labels: layers["labels"] !== false,
      "critical-incidents": layers["critical-incidents"] !== false,
      "high-incidents": layers["high-incidents"] !== false,
      "moderate-incidents": layers["moderate-incidents"] !== false,
      "low-incidents": layers["low-incidents"] !== false,
      hospitals: layers["hospitals"] !== false,
      shelters: layers["shelters"] !== false,
      "landslide-detections": layers["landslide-detections"] !== false,
    }),
    [layers],
  );

  return (
    <div ref={wrapperRef} className="absolute inset-0">
      <LiveMap
        className="h-full w-full"
        layers={liveLayers}
        onZoneSelect={setZone}
        selectedZoneId={zone?.id ?? null}
        events={MAP_EVENTS}
        selectedEventId={selectedEventId}
        onEventSelect={selectEvent}
        incidents={incidents}
        onIncidentSelect={selectIncident}
        landslideGeojson={landslideAnalysis?.geojson ?? null}
        selectedLandslideDetectionId={selectedLandslideDetectionId}
        onLandslideDetectionSelect={selectLandslideDetection}
        onReady={(api) => {
          apiRef.current = api;
        }}
      />

      {/* Recenter + fullscreen controls — anchored a fixed distance below the
          MapLibre zoom/compass control (also top-right, see LiveMap.tsx) so
          the two clusters keep a constant gap instead of drifting into each
          other as the map's height changes. */}
      <div className="absolute right-3 top-[112px] z-10 flex flex-col gap-2">
        <button
          onClick={() => apiRef.current?.reset()}
          aria-label="Recenter map"
          title="Recenter on region"
          className="map-card grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition-colors hover:text-accent"
        >
          <Crosshair size={16} />
        </button>
        <button
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "View fullscreen"}
          title={isFullscreen ? "Exit fullscreen" : "View fullscreen"}
          className="map-card grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition-colors hover:text-accent"
        >
          {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
        </button>
      </div>

      {/* Top-left control cluster — search, primary actions, layers. Wraps so it
          never overflows a narrow viewport. */}
      <div className="absolute left-3 right-16 top-3 z-20 flex flex-wrap items-start gap-2">
        <MapSearch
          onSelect={(result) => apiRef.current?.showSearchResult(result)}
          onClear={() => apiRef.current?.clearSearchResult()}
        />
        <PrimaryActions />
        <LayerControl />
      </div>

      <ZoneDetailPanel
        zone={zone}
        onClose={() => setZone(null)}
        onFocus={(d) => apiRef.current?.flyTo(d.center, 11)}
        focusLabel="Zoom to zone"
      />
    </div>
  );
}
