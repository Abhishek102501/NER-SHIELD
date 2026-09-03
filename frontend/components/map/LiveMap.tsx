"use client";

import {
  Map as MLMap,
  Marker as MLMarker,
  NavigationControl,
  setWorkerUrl,
  type LngLatLike,
  type MapGeoJSONFeature,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRightLeft,
  Gavel,
  KeyRound,
  Link2,
  MapPin,
  RadioTower,
  ShieldAlert,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { BRIDGES, DEPOTS, HOSPITALS } from "@/data/infrastructure";
import {
  INCIDENT_POINTS,
  MAP_CENTER,
  MAP_ZOOM,
  RAINFALL_OVERLAY,
  RISK_ZONES,
  RIVERS,
  ROADS,
  SCHOOLS,
  VILLAGES,
} from "@/data/geo";

import { SEVERITY, cn } from "@/lib/utils";
import type { RiskZone, Severity, TimelineEvent } from "@/types";

export interface LiveMapApi {
  flyTo: (center: [number, number], zoom?: number) => void;
  reset: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface LiveMapProps {
  className?: string;
  onZoneSelect?: (zone: RiskZone | null) => void;
  selectedZoneId?: string | null;
  layers?: Record<string, boolean>;
  onReady?: (api: LiveMapApi) => void;
  /** Mappable intelligence events (already filtered to real coordinates upstream). */
  events?: TimelineEvent[];
  selectedEventId?: string | null;
  onEventSelect?: (id: string | null) => void;
}

const DEFAULT_LAYERS: Record<string, boolean> = {};

// Dark, intelligence-style base — deep near-black land/water, muted borders,
// low visual noise. Free CARTO GL style, no API key required.
const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const TERRAIN_SOURCE = "https://tiles.mapterhorn.com/tilejson.json";
const TERRAIN_EXAGGERATION = 1.1;

// MapLibre's auto-detected worker URL resolves to an empty string under this
// project's bundler (Turbopack), which fails to load ("non-JavaScript MIME type of
// text/html" — the empty URL resolves to the current page). With no worker, vector
// tiles never get parsed, so nothing but the background color ever paints: this is
// the root cause of the map rendering blank. Pointing at the vendored worker bundle
// (copied into public/maplibre/, see that folder's contents) fixes it. Set once,
// before any Map is constructed.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

type MarkerKind = "incident" | "event" | "sensor";

interface MarkerRecord {
  id: string;
  kind: MarkerKind;
  severity: Severity | null;
  title: string;
  marker: MLMarker;
  lngLat: [number, number];
}

interface PopupState {
  kind: MarkerKind;
  id: string;
  x: number;
  y: number;
}

const ICON_PATH: Record<string, string> = {
  alert:
    '<line x1="12" y1="8" x2="12" y2="13"/><circle cx="12" cy="16.3" r="0.6" fill="currentColor" stroke="none"/>',
  check: '<polyline points="5 13 10 18 19 7"/>',
};

function coreIconSvg(kind: "alert" | "check" | "sensor"): string {
  if (kind === "sensor") {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="#05070e" stroke-width="2.4"><circle cx="12" cy="12" r="2.6"/><circle cx="12" cy="12" r="8" stroke-opacity="0.55"/></svg>';
  }
  return `<svg viewBox="0 0 24 24" fill="none" stroke="#05070e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${ICON_PATH[kind]}</svg>`;
}

function severityIconKind(severity: Severity): "alert" | "check" {
  return severity === "low" ? "check" : "alert";
}

/** Builds the DOM element for a MapLibre marker — layered glow / pulse / core. */
function buildMarkerEl(opts: {
  color: string;
  animated: boolean;
  isSensor: boolean;
  iconKind: "alert" | "check" | "sensor";
}): HTMLDivElement {
  const el = document.createElement("div");
  el.className = cn("ns-intel-marker", opts.isSensor && "is-sensor");
  el.style.setProperty("--marker-color", opts.color);
  el.innerHTML = `
    <span class="ns-intel-marker-glow"></span>
    ${opts.animated ? '<span class="ns-intel-marker-pulse pulse-ring"></span>' : ""}
    <span class="ns-intel-marker-core">${coreIconSvg(opts.iconKind)}</span>
  `;
  return el;
}

/** Regional overview bounds computed from every plotted point — never a fixed guess. */
function computeOverviewBounds(points: [number, number][]): [[number, number], [number, number]] | null {
  if (!points.length) return null;
  let west = Infinity;
  let east = -Infinity;
  let south = Infinity;
  let north = -Infinity;
  for (const [lng, lat] of points) {
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  return [
    [west, south],
    [east, north],
  ];
}

export default function LiveMap({
  className,
  onZoneSelect,
  selectedZoneId,
  layers = DEFAULT_LAYERS,
  onReady,
  events = [],
  selectedEventId = null,
  onEventSelect,
}: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const readyRef = useRef(false);
  const markersRef = useRef<Map<string, MarkerRecord>>(new Map());
  const layersRef = useRef(layers);
  const applyMarkerVisibilityRef = useRef<() => void>(() => {});
  const [popup, setPopup] = useState<PopupState | null>(null);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(() => {
    const container = containerRef.current;
    const markers = markersRef.current;

    if (!container || mapRef.current) {
      return;
    }

    // ------------------------------------------------------------
    // GIS INCIDENTS + SECURITY EVENTS + SENSORS (shared coordinate list)
    // ------------------------------------------------------------

    const incidentEntries = INCIDENT_POINTS.features.map((f) => {
      const p = f.properties as { id: string; name: string; band: Severity };
      const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates as [number, number];
      return { id: p.id, name: p.name, severity: p.band, lngLat: [lng, lat] as [number, number] };
    });

    const sensorEntries = [...HOSPITALS, ...BRIDGES, ...DEPOTS].map((p) => ({
      id: p.id,
      name: p.name,
      kind: p.kind,
      lngLat: p.center,
    }));

    const eventEntries = events
      .filter((e) => typeof e.latitude === "number" && typeof e.longitude === "number")
      .map((e) => ({
        id: e.id,
        name: e.title,
        severity: e.severity,
        lngLat: [e.longitude as number, e.latitude as number] as [number, number],
      }));

    const overviewBounds = computeOverviewBounds([
      ...incidentEntries.map((e) => e.lngLat),
      ...eventEntries.map((e) => e.lngLat),
    ]);

    // A tight cluster (e.g. the homepage's Sikkim-only incidents, no `events` prop)
    // keeps the existing dramatic 3D pitch; a wide spread (Command Center events
    // across the region) flattens out so the perspective doesn't distort.
    const overviewSpan = overviewBounds
      ? Math.max(
          overviewBounds[1][0] - overviewBounds[0][0],
          overviewBounds[1][1] - overviewBounds[0][1],
        )
      : 0;
    const overviewPitch = overviewSpan > 5 ? 0 : 55;

    // ------------------------------------------------------------
    // CREATE MAP
    // ------------------------------------------------------------

    const map = new MLMap({
      container,
      style: MAP_STYLE,

      center: MAP_CENTER,
      zoom: MAP_ZOOM,

      minZoom: 2,
      maxZoom: 16,

      pitch: overviewPitch,
      bearing: 0,
      maxPitch: 85,

      attributionControl: false,
    });

    mapRef.current = map;

    // A regional overview showing every intelligence point, computed from real
    // coordinates rather than a hardcoded guess. Falls back to the existing default
    // Sikkim view if there is nothing to bound (e.g. no events supplied). Capped at
    // the original default zoom so a tight cluster doesn't zoom in further than the
    // established design intended — it only zooms OUT to fit a wider spread.
    if (overviewBounds) {
      map.fitBounds(overviewBounds, {
        padding: 64,
        pitch: overviewPitch,
        bearing: 0,
        duration: 0,
        maxZoom: MAP_ZOOM,
      });
    }

    // ------------------------------------------------------------
    // NAVIGATION
    // ------------------------------------------------------------

    map.addControl(
      new NavigationControl({
        showCompass: true,
        visualizePitch: true,
      }),
      "bottom-right",
    );

    // Enable 3D rotation.
    map.dragRotate.enable();
    map.touchZoomRotate.enableRotation();

    // ------------------------------------------------------------
    // MARKER HELPERS
    // ------------------------------------------------------------

    function severityVisible(sev: Severity): boolean {
      const key = `${sev}-incidents`;
      const granular = layersRef.current[key];
      const legacy = layersRef.current["incidents"];
      return (granular === undefined ? true : granular) && (legacy === undefined ? true : legacy);
    }

    function sensorVisible(): boolean {
      const granular = layersRef.current["sensors"];
      const legacy = layersRef.current["infrastructure"];
      return (granular === undefined ? true : granular) && (legacy === undefined ? true : legacy);
    }

    function addMarker(
      key: string,
      kind: MarkerKind,
      lngLat: [number, number],
      title: string,
      severity: Severity | null,
    ) {
      const color = severity ? SEVERITY[severity].hex : "#22d3ee";
      const animated = severity === "critical" || severity === "high";
      const isSensor = kind === "sensor";
      const el = buildMarkerEl({
        color,
        animated,
        isSensor,
        iconKind: isSensor ? "sensor" : severityIconKind(severity ?? "low"),
      });

      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const point = map.project(lngLat as LngLatLike);
        setPopup((prev) =>
          prev?.id === key ? null : { kind, id: key, x: point.x, y: point.y },
        );
        if (kind === "event") {
          onEventSelect?.(key.split(":")[1]);
        }
      });

      const marker = new MLMarker({ element: el, anchor: "center" })
        .setLngLat(lngLat)
        .addTo(map);

      markers.set(key, { id: key, kind, severity, title, marker, lngLat });
    }

    // ------------------------------------------------------------
    // MAP LOAD
    // ------------------------------------------------------------

    map.on("load", () => {
      // ----------------------------------------------------------
      // TERRAIN (subtle relief, muted to match the dark base)
      // ----------------------------------------------------------

      map.addSource("terrainSource", {
        type: "raster-dem",
        url: TERRAIN_SOURCE,
        tileSize: 256,
      });

      if (layersRef.current["terrain-3d"] !== false) {
        map.setTerrain({ source: "terrainSource", exaggeration: TERRAIN_EXAGGERATION });
      }

      map.addLayer({
        id: "hillshade",
        type: "hillshade",
        source: "terrainSource",
        paint: {
          "hillshade-shadow-color": "#000814",
          "hillshade-highlight-color": "#16233a",
          "hillshade-accent-color": "#0b1120",
          "hillshade-exaggeration": 0.35,
        },
      });

      // ----------------------------------------------------------
      // NER-SHIELD GEOJSON SOURCES
      // ----------------------------------------------------------

      map.addSource("risk-zones", {
        type: "geojson",
        data: RISK_ZONES,
      });

      map.addSource("rainfall", {
        type: "geojson",
        data: RAINFALL_OVERLAY,
      });

      map.addSource("roads", {
        type: "geojson",
        data: ROADS,
      });

      map.addSource("rivers", {
        type: "geojson",
        data: RIVERS,
      });

      map.addSource("villages", {
        type: "geojson",
        data: VILLAGES,
      });

      map.addSource("schools", {
        type: "geojson",
        data: SCHOOLS,
      });

      // ----------------------------------------------------------
      // RAINFALL HEATMAP
      // ----------------------------------------------------------

      map.addLayer({
        id: "rainfall",
        type: "heatmap",
        source: "rainfall",

        paint: {
          "heatmap-weight": ["coalesce", ["get", "intensity"], 0],
          "heatmap-intensity": 0.8,
          "heatmap-radius": 46,
          "heatmap-opacity": 0.4,
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(0,0,0,0)",
            0.3,
            "rgba(34,211,238,0.3)",
            0.6,
            "rgba(56,189,248,0.45)",
            0.8,
            "rgba(249,115,22,0.55)",
            1,
            "rgba(239,68,68,0.65)",
          ],
        },
      });

      // ----------------------------------------------------------
      // RIVERS
      // ----------------------------------------------------------

      map.addLayer({
        id: "rivers",
        type: "line",
        source: "rivers",
        paint: {
          "line-color": "#38bdf8",
          "line-width": 2.5,
          "line-opacity": 0.5,
        },
      });

      // ----------------------------------------------------------
      // ROADS
      // ----------------------------------------------------------

      map.addLayer({
        id: "roads",
        type: "line",
        source: "roads",
        paint: {
          "line-color": "#5f7188",
          "line-width": ["case", ["==", ["get", "cls"], "national"], 3, 1.6],
          "line-opacity": 0.65,
        },
      });

      // ----------------------------------------------------------
      // RISK ZONES — soft glow fill + crisp outline
      // ----------------------------------------------------------

      map.addLayer({
        id: "risk-zones-glow",
        type: "fill",
        source: "risk-zones",
        paint: {
          "fill-color": ["coalesce", ["get", "color"], "#ef4444"],
          "fill-opacity": 0.1,
        },
      });

      map.addLayer({
        id: "risk-zones-fill",
        type: "fill",
        source: "risk-zones",
        paint: {
          "fill-color": ["coalesce", ["get", "color"], "#ef4444"],
          "fill-opacity": 0.14,
        },
      });

      map.addLayer({
        id: "risk-zones-line",
        type: "line",
        source: "risk-zones",
        paint: {
          "line-color": ["coalesce", ["get", "color"], "#ef4444"],
          "line-width": 1.5,
          "line-opacity": 0.8,
        },
      });

      map.addLayer({
        id: "risk-zones-highlight",
        type: "line",
        source: "risk-zones",
        paint: {
          "line-color": "#ffffff",
          "line-width": 2.5,
          "line-opacity": 0.9,
        },
        filter: ["==", ["get", "id"], "__none__"],
      });

      // ----------------------------------------------------------
      // VILLAGES / SCHOOLS (unchanged, decorative context points)
      // ----------------------------------------------------------

      map.addLayer({
        id: "villages",
        type: "circle",
        source: "villages",
        paint: {
          "circle-radius": 3.5,
          "circle-color": "#94a3b8",
          "circle-stroke-color": "#05070e",
          "circle-stroke-width": 1.5,
        },
      });

      map.addLayer({
        id: "schools",
        type: "circle",
        source: "schools",
        paint: {
          "circle-radius": 3.5,
          "circle-color": "#a78bfa",
          "circle-stroke-color": "#05070e",
          "circle-stroke-width": 1.5,
        },
      });

      // ----------------------------------------------------------
      // GEOGRAPHIC LABELS toggle — muted cyan-gray for symbol layers
      // ----------------------------------------------------------

      for (const layer of map.getStyle().layers) {
        if (layer.type === "symbol") {
          try {
            map.setPaintProperty(layer.id, "text-color", "#7d93ad");
            map.setPaintProperty(layer.id, "text-halo-color", "#05070e");
            map.setPaintProperty(layer.id, "text-halo-width", 1.2);
          } catch {
            // Some symbol layers (icons only) have no text paint props — ignore.
          }
        }
      }

      // ----------------------------------------------------------
      // INTELLIGENCE MARKERS — GIS incidents, sensors, security events
      // ----------------------------------------------------------

      for (const inc of incidentEntries) {
        addMarker(`incident:${inc.id}`, "incident", inc.lngLat, inc.name, inc.severity);
      }
      for (const s of sensorEntries) {
        addMarker(`sensor:${s.id}`, "sensor", s.lngLat, s.name, null);
      }
      for (const ev of eventEntries) {
        addMarker(`event:${ev.id}`, "event", ev.lngLat, ev.name, ev.severity);
      }

      applyMarkerVisibility();

      // ----------------------------------------------------------
      // READY
      // ----------------------------------------------------------

      readyRef.current = true;

      applyLayerVisibility(map, layersRef.current);

      // ----------------------------------------------------------
      // EXPOSE MAP API
      // ----------------------------------------------------------

      onReady?.({
        flyTo: (center, zoom) => {
          map.flyTo({
            center,
            zoom: zoom ?? 11,
            pitch: 55,
            duration: 1200,
            essential: true,
          });
        },

        reset: () => {
          if (overviewBounds) {
            map.fitBounds(overviewBounds, {
              padding: 64,
              pitch: overviewPitch,
              bearing: 0,
              duration: 900,
              maxZoom: MAP_ZOOM,
            });
          } else {
            map.flyTo({
              center: MAP_CENTER,
              zoom: MAP_ZOOM,
              pitch: overviewPitch,
              bearing: 0,
              duration: 900,
              essential: true,
            });
          }
        },

        zoomIn: () => map.zoomIn(),
        zoomOut: () => map.zoomOut(),
      });

      // ----------------------------------------------------------
      // RISK ZONE CLICK / HOVER
      // ----------------------------------------------------------

      map.on("click", "risk-zones-fill", (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0] as MapGeoJSONFeature | undefined;
        if (!feature || !onZoneSelect) return;
        onZoneSelect(feature.properties as unknown as RiskZone);
      });

      map.on("mouseenter", "risk-zones-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "risk-zones-fill", () => {
        map.getCanvas().style.cursor = "";
      });

      // Clicking empty map space dismisses any open intelligence popup.
      map.on("click", () => setPopup(null));

      // Keep the popup pinned to its marker while panning/zooming.
      map.on("move", () => {
        setPopup((prev) => {
          if (!prev) return prev;
          const rec = markers.get(prev.id);
          if (!rec) return null;
          const point = map.project(rec.lngLat as LngLatLike);
          return { ...prev, x: point.x, y: point.y };
        });
      });
    });

    function applyMarkerVisibility() {
      for (const rec of markers.values()) {
        const visible =
          rec.kind === "sensor"
            ? sensorVisible()
            : rec.severity
              ? severityVisible(rec.severity)
              : true;
        rec.marker.getElement().style.display = visible ? "" : "none";
      }
    }

    // Re-applied whenever `layers` changes — see the effect below, which calls
    // this same closure via a ref so the map is never recreated.
    applyMarkerVisibilityRef.current = applyMarkerVisibility;

    // ------------------------------------------------------------
    // RESIZE
    // ------------------------------------------------------------

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });

    resizeObserver.observe(container);

    // ------------------------------------------------------------
    // CLEANUP
    // ------------------------------------------------------------

    return () => {
      resizeObserver.disconnect();

      for (const rec of markers.values()) {
        rec.marker.remove();
      }
      markers.clear();

      map.remove();

      mapRef.current = null;
      readyRef.current = false;
    };

    // Map intentionally initializes once; `events`/`layers` are applied via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------------------------------------------
  // SELECTED ZONE
  // --------------------------------------------------------------

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    if (!map.getLayer("risk-zones-highlight")) return;

    map.setFilter("risk-zones-highlight", ["==", ["get", "id"], selectedZoneId ?? "__none__"]);
  }, [selectedZoneId]);

  // --------------------------------------------------------------
  // SELECTED INTELLIGENCE EVENT (map ⇄ Risk Timeline sync)
  // --------------------------------------------------------------

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;

    for (const rec of markersRef.current.values()) {
      const isActive = rec.kind === "event" && rec.id === `event:${selectedEventId}`;
      rec.marker.getElement().classList.toggle("is-active", isActive);
    }

    if (!selectedEventId) {
      return;
    }

    const rec = markersRef.current.get(`event:${selectedEventId}`);
    // No coordinates for this event (or it isn't a map event at all) — safely do
    // nothing rather than invent a location.
    if (!rec) return;

    map.flyTo({ center: rec.lngLat, zoom: 9, pitch: 55, duration: 1200, essential: true });

    const point = map.project(rec.lngLat as LngLatLike);
    setPopup({ kind: "event", id: rec.id, x: point.x, y: point.y });
  }, [selectedEventId]);

  // --------------------------------------------------------------
  // LAYER VISIBILITY
  // --------------------------------------------------------------

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;

    applyLayerVisibility(map, layers);
    applyMarkerVisibilityRef.current();

    if (map.getLayer("hillshade") || map.getSource("terrainSource")) {
      const wantTerrain = layers["terrain-3d"] !== false;
      const hasTerrain = !!map.getTerrain();
      if (wantTerrain && !hasTerrain) {
        map.setTerrain({ source: "terrainSource", exaggeration: TERRAIN_EXAGGERATION });
      } else if (!wantTerrain && hasTerrain) {
        map.setTerrain(null);
      }
    }

    const wantLabels = layers["labels"] !== false;
    for (const layer of map.getStyle().layers) {
      if (layer.type === "symbol") {
        map.setLayoutProperty(layer.id, "visibility", wantLabels ? "visible" : "none");
      }
    }
  }, [layers]);

  // --------------------------------------------------------------
  // POPUP CONTENT
  // --------------------------------------------------------------

  const popupData = useMemo(() => {
    if (!popup) return null;
    if (popup.kind === "event") {
      const evt = events.find((e) => e.id === popup.id.split(":")[1]);
      return evt ? { kind: "event" as const, event: evt } : null;
    }
    if (popup.kind === "incident") {
      const feature = INCIDENT_POINTS.features.find(
        (f) => (f.properties as { id: string }).id === popup.id.split(":")[1],
      );
      return feature ? { kind: "incident" as const, feature } : null;
    }
    const s = [...HOSPITALS, ...BRIDGES, ...DEPOTS].find((p) => p.id === popup.id.split(":")[1]);
    return s ? { kind: "sensor" as const, sensor: s } : null;
  }, [popup, events]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className={cn("ns-command-map", className)}
        style={{ width: "100%", height: "100%" }}
        onClick={() => setPopup(null)}
      />

      <AnimatePresence>
        {popup && popupData && (
          <MapPopup
            x={popup.x}
            y={popup.y}
            data={popupData}
            onClose={() => {
              setPopup(null);
              if (popupData.kind === "event") onEventSelect?.(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ================================================================
// LAYER VISIBILITY (GL style layers)
// ================================================================

function applyLayerVisibility(map: MLMap, layers: Record<string, boolean>) {
  const groups: Record<string, string[]> = {
    "risk-zones": ["risk-zones-fill", "risk-zones-glow", "risk-zones-line", "risk-zones-highlight"],
    rainfall: ["rainfall"],
    roads: ["roads"],
    rivers: ["rivers"],
    villages: ["villages"],
    schools: ["schools"],
  };

  for (const [key, layerIds] of Object.entries(groups)) {
    const visible = layers[key] !== false;
    for (const layerId of layerIds) {
      if (!map.getLayer(layerId)) continue;
      map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
    }
  }
}

// ================================================================
// PREMIUM INTELLIGENCE POPUP
// ================================================================

const CATEGORY_ICON: Record<string, LucideIcon> = {
  "Data Exposure": ShieldAlert,
  "Behavioral Anomaly": TriangleAlert,
  "Network Activity": ArrowRightLeft,
  Intelligence: Link2,
  "Access Control": KeyRound,
  Compliance: Gavel,
};

type PopupData =
  | { kind: "event"; event: TimelineEvent }
  | { kind: "incident"; feature: GeoJSON.Feature }
  | { kind: "sensor"; sensor: { id: string; name: string; kind: string } };

function MapPopup({
  x,
  y,
  data,
  onClose,
}: {
  x: number;
  y: number;
  data: PopupData;
  onClose: () => void;
}) {
  const flipX = x > 420;
  const flipY = y < 180;

  let title = "";
  let severity: Severity | null = null;
  let location = "";
  let detail1: { label: string; value: string } | null = null;
  let detail2: { label: string; value: string } | null = null;
  let description = "";
  let status = "";
  let Icon: LucideIcon = MapPin;

  if (data.kind === "event") {
    const e = data.event;
    title = e.title;
    severity = e.severity;
    location = e.location ?? "Location unavailable";
    detail1 = { label: "Entity", value: e.entity ?? "—" };
    detail2 = { label: "Detected", value: e.time };
    description = e.description ?? "";
    status = e.status ?? "";
    Icon = CATEGORY_ICON[e.category] ?? ShieldAlert;
  } else if (data.kind === "incident") {
    const p = data.feature.properties as { name: string; band: Severity };
    title = p.name;
    severity = p.band;
    location = "Sikkim GIS Sector";
    detail1 = { label: "Type", value: "Disaster Risk Incident" };
    description = "Field-reported incident within an active risk zone.";
    status = "Field Verification";
    Icon = TriangleAlert;
  } else {
    title = data.sensor.name;
    location = "Infrastructure Network";
    detail1 = { label: "Type", value: data.sensor.kind };
    description = "Monitored infrastructure asset.";
    status = "Nominal";
    Icon = RadioTower;
  }

  const accent = severity ? SEVERITY[severity].hex : "#22d3ee";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(${flipX ? "-100%" : "12px"}, ${flipY ? "12px" : "-100%"})`,
      }}
      className="glass-float z-30 w-56 rounded-xl p-3"
    >
      <span
        className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl"
        style={{ background: accent }}
      />
      <div className="flex items-start gap-2.5">
        <div
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md"
          style={{ background: `${accent}1f`, color: accent }}
        >
          <Icon size={13} />
        </div>
        <div className="min-w-0 flex-1">
          {severity && (
            <span
              className={cn("text-[9px] font-bold uppercase tracking-wider", SEVERITY[severity].text)}
            >
              {SEVERITY[severity].label} Risk
            </span>
          )}
          <p className="truncate text-[12px] font-semibold text-fg">{title}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close intelligence popup"
          className="shrink-0 text-fg-dim hover:text-fg"
        >
          <X size={13} />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-fg-muted">
        <MapPin size={10} className="shrink-0 text-fg-dim" />
        <span className="truncate">{location}</span>
      </div>

      {(detail1 || detail2) && (
        <dl className="mt-1.5 space-y-1 text-[10px]">
          {detail1 && (
            <div className="flex justify-between gap-3">
              <dt className="text-fg-dim">{detail1.label}</dt>
              <dd className="truncate text-fg">{detail1.value}</dd>
            </div>
          )}
          {detail2 && (
            <div className="flex justify-between gap-3">
              <dt className="text-fg-dim">{detail2.label}</dt>
              <dd className="numeric text-fg">{detail2.value}</dd>
            </div>
          )}
        </dl>
      )}

      {description && (
        <p className="mt-1.5 text-[10px] leading-relaxed text-fg-muted">{description}</p>
      )}

      {status && (
        <div className="mt-1.5 flex items-center justify-between border-t border-white/8 pt-1.5">
          <span className="text-[9px] uppercase tracking-wider text-fg-dim">Status</span>
          <span className="text-[10px] font-medium text-fg">{status}</span>
        </div>
      )}
    </motion.div>
  );
}
