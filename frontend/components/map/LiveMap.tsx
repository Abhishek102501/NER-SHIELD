"use client";

import {
  AttributionControl,
  Map as MLMap,
  Marker as MLMarker,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type LngLatLike,
  type MapGeoJSONFeature,
  type MapLayerMouseEvent,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRightLeft,
  Gavel,
  Home,
  Hospital,
  KeyRound,
  Link2,
  MapPin,
  RadioTower,
  Route,
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
import type { LocationResult } from "@/services/geocoding";
import type { Incident, InfraStatus, RiskZone, Severity, TimelineEvent } from "@/types";

/** Zoom level to land on per search-result category — tighter for smaller places. */
const ZOOM_BY_CATEGORY: Record<LocationResult["category"], number> = {
  country: 5,
  state: 7,
  city: 10,
  district: 10,
  village: 13,
  landmark: 13,
  coordinate: 13,
};

export interface LiveMapApi {
  flyTo: (center: [number, number], zoom?: number) => void;
  reset: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  /** Flies to a search result, drops a highlighted marker, and fits its bounds if known. */
  showSearchResult: (result: LocationResult) => void;
  /** Removes the search-result marker, if any. */
  clearSearchResult: () => void;
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
  /** Live incidents from the command-context single source of truth. When
   * provided, newly-created incidents (report form, live data) get a marker
   * as soon as they exist — the seed incidents still render via the
   * always-there INCIDENT_POINTS pass below, so nothing double-renders
   * (same ids, same coordinates). Omitted entirely by the homepage preview,
   * which has no CommandProvider to source it from. */
  incidents?: Incident[];
  onIncidentSelect?: (id: string) => void;
}

const DEFAULT_LAYERS: Record<string, boolean> = {};

// Esri World Topographic Map — free, no API key. Switched from raw OpenStreetMap
// raster (tried first) because plain OSM tiles render whatever script a place's
// primary OSM name tag happens to use, which produced non-English labels near
// this region's China/Bhutan/Nepal borders (e.g. a Chinese nature-reserve label
// bled into the Sikkim viewport). Esri's global topographic basemap carries the
// same real terrain/forest/river/road/boundary geography but with consistently
// Latin-script/English place names worldwide, plus baked-in hillshade, contour
// texture and elevation-labeled peaks — the closest free match to the requested
// look. No vector OSM style offers per-tile language switching without a paid
// API key (MapTiler/Stadia/Thunderforest all require one for this).
const MAP_STYLE: StyleSpecification = {
  version: 8,
  // Needed for our own symbol layers (e.g. incident-cluster counts) to render
  // text — the raster basemap itself has no glyphs of its own.
  glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
  sources: {
    "esri-topo": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        "Esri, HERE, Garmin, FAO, NOAA, USGS, © OpenStreetMap contributors, GIS User Community",
    },
  },
  layers: [
    {
      id: "esri-topo",
      type: "raster",
      source: "esri-topo",
      // Untouched — Esri's topo palette is already the muted-GIS target, and
      // any desaturation/brightness floor just washes out labels and terrain
      // contrast (readability > extra muting).
      paint: {},
    },
  ],
};

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
  /** Infrastructure category (hospital/bridge/depot) — drives the granular
   * layer-visibility check for "sensor"-kind (infrastructure) markers. */
  infraKind?: string;
}

interface PopupState {
  kind: MarkerKind;
  id: string;
  x: number;
  y: number;
}

type IconKind = "alert" | "check" | "sensor" | "pin" | "hospital" | "home" | "road";

const ICON_PATH: Record<string, string> = {
  alert:
    '<line x1="12" y1="8" x2="12" y2="13"/><circle cx="12" cy="16.3" r="0.6" fill="currentColor" stroke="none"/>',
  check: '<polyline points="5 13 10 18 19 7"/>',
};

/** Professional, library-style glyphs drawn inline (no emoji) — every marker
 * renders on a white circular base, so all strokes use currentColor and pick
 * up the marker's own `--marker-color` via CSS. */
function coreIconSvg(kind: IconKind): string {
  if (kind === "sensor") {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="2.6"/><circle cx="12" cy="12" r="8" stroke-opacity="0.55"/></svg>';
  }
  if (kind === "pin") {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6.5-5.7-6.5-10.3A6.5 6.5 0 0 1 18.5 10.7C18.5 15.3 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.1" fill="currentColor" stroke="none"/></svg>';
  }
  if (kind === "hospital") {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/></svg>';
  }
  if (kind === "home") {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11.5 12 4l8 7.5"/><path d="M6.5 10v9.5h11V10"/></svg>';
  }
  if (kind === "road") {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M8 20 10.5 4"/><path d="M16 20 13.5 4"/><path d="M12 6v2M12 11v2M12 16v2"/></svg>';
  }
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${ICON_PATH[kind]}</svg>`;
}

function severityIconKind(severity: Severity): "alert" | "check" {
  return severity === "low" ? "check" : "alert";
}

/** Infrastructure kind → accent color + glyph (blue/purple/teal per category,
 * matching the light GIS marker treatment — never emoji). */
const INFRA_STYLE: Record<string, { color: string; icon: IconKind }> = {
  hospital: { color: "#2563eb", icon: "hospital" },
  bridge: { color: "#7c3aed", icon: "road" },
  depot: { color: "#0d9488", icon: "home" },
};

/** Bridge condition → color, overriding the category color when a bridge isn't
 * in normal condition (mirrors the real proximity-to-hazard status on the
 * bridge record, never an invented alert). */
const BRIDGE_STATUS_COLOR: Record<string, string> = {
  warning: "#f59e0b",
  damaged: "#dc2626",
  blocked: "#dc2626",
};

/** Builds the DOM element for a MapLibre marker — layered glow / pulse / core. */
function buildMarkerEl(opts: {
  color: string;
  animated: boolean;
  isSensor: boolean;
  iconKind: IconKind;
  extraClass?: string;
}): HTMLDivElement {
  const el = document.createElement("div");
  el.className = cn("ns-intel-marker", opts.isSensor && "is-sensor", opts.extraClass);
  el.style.setProperty("--marker-color", opts.color);
  el.innerHTML = `
    <span class="ns-intel-marker-glow"></span>
    ${opts.animated ? '<span class="ns-intel-marker-pulse pulse-ring"></span>' : ""}
    <span class="ns-intel-marker-core">${coreIconSvg(opts.iconKind)}</span>
  `;
  return el;
}

interface IncidentEntry {
  id: string;
  name: string;
  severity: Severity;
  lngLat: [number, number];
}

/** Builds the clustered-incident source data, honoring the moderate/low layer toggles. */
function clusterGeoJSON(
  entries: IncidentEntry[],
  layers: Record<string, boolean>,
): GeoJSON.FeatureCollection {
  const moderateOn = layers["moderate-incidents"] !== false && layers["incidents"] !== false;
  const lowOn = layers["low-incidents"] !== false && layers["incidents"] !== false;
  return {
    type: "FeatureCollection",
    features: entries
      .filter((e) => (e.severity === "moderate" ? moderateOn : lowOn))
      .map((e) => ({
        type: "Feature",
        properties: { id: e.id, name: e.name, severity: e.severity, color: SEVERITY[e.severity].hex },
        geometry: { type: "Point", coordinates: e.lngLat },
      })),
  };
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
  incidents: incidentsProp,
  onIncidentSelect,
}: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const readyRef = useRef(false);
  const markersRef = useRef<Map<string, MarkerRecord>>(new Map());
  const layersRef = useRef(layers);
  const applyMarkerVisibilityRef = useRef<() => void>(() => {});
  const clusterEntriesRef = useRef<IncidentEntry[]>([]);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [hoverTooltip, setHoverTooltip] = useState<
    { x: number; y: number; name: string; band: Severity } | null
  >(null);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(() => {
    const container = containerRef.current;
    const markers = markersRef.current;
    let searchMarker: MLMarker | null = null;

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

    // Critical/high incidents always render as individually-visible DOM markers —
    // never clustered away, per "avoid hiding critical threats unnecessarily".
    // Moderate/low incidents feed a real MapLibre clustered GeoJSON source instead,
    // which is what keeps a dense demo dataset from clutter at low zoom.
    const criticalHighEntries = incidentEntries.filter(
      (e) => e.severity === "critical" || e.severity === "high",
    );
    const clusterableEntries = incidentEntries.filter(
      (e) => e.severity === "moderate" || e.severity === "low",
    );
    clusterEntriesRef.current = clusterableEntries;

    const sensorEntries = [...HOSPITALS, ...BRIDGES, ...DEPOTS].map((p) => ({
      id: p.id,
      name: p.name,
      kind: p.kind,
      lngLat: p.center,
      status: p.status,
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

      // OSM raster tiles require attribution — kept compact so it stays out of
      // the way of the map UI.
      attributionControl: false,
    });

    map.addControl(new AttributionControl({ compact: true }), "bottom-right");

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

    // Top-right, not bottom-right: CommandMap's recenter/fullscreen buttons
    // are also anchored to the top-right corner (fixed offset below this
    // control) so the two clusters can never collide regardless of map
    // height — a vertically-centered vs. bottom-anchored pairing did, on a
    // short map, converge and overlap.
    map.addControl(
      new NavigationControl({
        showCompass: true,
        visualizePitch: true,
      }),
      "top-right",
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

    // Infrastructure kind → its own granular layer-toggle id (Transport>Bridges,
    // Infrastructure>Hospitals/Relief Shelters — see data/layers.ts).
    const INFRA_LAYER_ID: Record<string, string> = {
      hospital: "hospitals",
      bridge: "bridges",
      depot: "shelters",
    };

    function infraVisible(infraKind: string | undefined): boolean {
      const layerId = infraKind ? INFRA_LAYER_ID[infraKind] : undefined;
      const granular = layerId ? layersRef.current[layerId] : undefined;
      const legacy = layersRef.current["infrastructure"];
      return (granular === undefined ? true : granular) && (legacy === undefined ? true : legacy);
    }

    function addMarker(
      key: string,
      kind: MarkerKind,
      lngLat: [number, number],
      title: string,
      severity: Severity | null,
      infraKind?: string,
      status?: string,
    ) {
      const isSensor = kind === "sensor";
      const infraStyle = infraKind ? INFRA_STYLE[infraKind] : undefined;
      const statusColor = infraKind === "bridge" && status ? BRIDGE_STATUS_COLOR[status] : undefined;
      const color = severity ? SEVERITY[severity].hex : (statusColor ?? infraStyle?.color ?? "#22c55e");
      const animated =
        severity === "critical" ||
        severity === "high" ||
        status === "damaged" ||
        status === "blocked";
      const el = buildMarkerEl({
        color,
        animated,
        isSensor,
        iconKind: infraStyle?.icon ?? (isSensor ? "sensor" : severityIconKind(severity ?? "low")),
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

      markers.set(key, { id: key, kind, severity, title, marker, lngLat, infraKind });
    }

    // ------------------------------------------------------------
    // MAP LOAD
    // ------------------------------------------------------------

    map.on("load", () => {
      // ----------------------------------------------------------
      // TERRAIN (low-contrast relief — mountains stay legible under the
      // risk/intelligence layers without competing with them)
      // ----------------------------------------------------------

      map.addSource("terrainSource", {
        type: "raster-dem",
        url: TERRAIN_SOURCE,
        tileSize: 256,
      });

      if (layersRef.current["terrain-3d"] !== false) {
        map.setTerrain({ source: "terrainSource", exaggeration: TERRAIN_EXAGGERATION });
      }

      // Esri's own basemap already bakes in hillshade/contour texture — this
      // layer only adds a light crispness boost, kept subtle to avoid
      // double-shading the terrain into a muddy look.
      map.addLayer({
        id: "hillshade",
        type: "hillshade",
        source: "terrainSource",
        paint: {
          "hillshade-shadow-color": "#8a9285",
          "hillshade-highlight-color": "#fbfcfa",
          "hillshade-accent-color": "#c9d2c3",
          "hillshade-exaggeration": 0.12,
          "hillshade-illumination-anchor": "map",
        },
      });

      // ----------------------------------------------------------
      // NER-SHIELD GEOJSON SOURCES
      // ----------------------------------------------------------

      map.addSource("risk-zones", {
        type: "geojson",
        data: RISK_ZONES,
        // Required for feature-state (hover highlight) below.
        generateId: true,
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
            "rgba(34,197,94,0.3)",
            0.6,
            "rgba(132,204,22,0.45)",
            0.8,
            "rgba(249,115,22,0.55)",
            1,
            "rgba(220,38,38,0.65)",
          ],
        },
      });

      // ----------------------------------------------------------
      // RIVERS — clear medium blue, thicker for major waterways
      // ----------------------------------------------------------

      // A light casing under the river line keeps it reading as unmistakably
      // "water" against forest/terrain green-brown, the same treatment used
      // for road hierarchy below.
      map.addLayer({
        id: "rivers-casing",
        type: "line",
        source: "rivers",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#e0f2fe",
          "line-width": 6,
          "line-opacity": 0.55,
        },
      });

      map.addLayer({
        id: "rivers",
        type: "line",
        source: "rivers",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#1d4ed8",
          "line-width": 4,
          "line-opacity": 0.95,
        },
      });

      // ----------------------------------------------------------
      // ROADS — dark-gray primary highways with a light casing so they read
      // clearly over terrain and stay visible through risk-zone tinting;
      // secondary/district roads render thinner and lighter.
      // ----------------------------------------------------------

      map.addLayer({
        id: "roads-casing",
        type: "line",
        source: "roads",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#ffffff",
          "line-width": ["case", ["==", ["get", "cls"], "national"], 6, 3.6],
          "line-opacity": 0.9,
        },
      });

      map.addLayer({
        id: "roads",
        type: "line",
        source: "roads",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          // A road's own status (warning/blocked) overrides the plain
          // highway/local hierarchy color — real field condition, not decoration.
          "line-color": [
            "match",
            ["get", "status"],
            "blocked",
            "#dc2626",
            "warning",
            "#f59e0b",
            ["case", ["==", ["get", "cls"], "national"], "#3f4a56", "#6b7280"],
          ],
          "line-width": ["case", ["==", ["get", "cls"], "national"], 3.2, 1.8],
          "line-opacity": 0.9,
        },
      });

      // ----------------------------------------------------------
      // EMERGENCY / EVACUATION ROUTES — the subset of the same road geometry
      // flagged as an evacuation corridor (never a separately drawn route).
      // ----------------------------------------------------------

      map.addLayer({
        id: "evacuation-routes",
        type: "line",
        source: "roads",
        filter: ["==", ["get", "evacuationRoute"], true],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#0ea5e9",
          "line-width": 4,
          "line-opacity": 0.9,
          "line-dasharray": [0.1, 1.6],
        },
      });

      // ----------------------------------------------------------
      // RISK ZONES — soft glow fill + crisp outline
      // ----------------------------------------------------------

      // Per-band base opacity/width — kept low so terrain, roads and rivers
      // stay legible underneath (spec: transparency + clean borders, never a
      // saturated opaque fill).
      const RISK_BASE_OPACITY = [
        "match",
        ["get", "band"],
        "critical",
        0.24,
        "high",
        0.2,
        "moderate",
        0.17,
        "low",
        0.14,
        0.16,
      ] as unknown as number;
      const RISK_LINE_WIDTH = [
        "match",
        ["get", "band"],
        "critical",
        2.6,
        "high",
        2,
        "moderate",
        2,
        "low",
        1.6,
        1.6,
      ] as unknown as number;

      map.addLayer({
        id: "risk-zones-glow",
        type: "fill",
        source: "risk-zones",
        paint: {
          "fill-color": ["coalesce", ["get", "color"], "#dc2626"],
          "fill-opacity": 0.06,
        },
      });

      map.addLayer({
        id: "risk-zones-fill",
        type: "fill",
        source: "risk-zones",
        paint: {
          "fill-color": ["coalesce", ["get", "color"], "#dc2626"],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.32,
            RISK_BASE_OPACITY,
          ],
        },
      });

      map.addLayer({
        id: "risk-zones-line",
        type: "line",
        source: "risk-zones",
        paint: {
          "line-color": ["coalesce", ["get", "color"], "#dc2626"],
          "line-width": RISK_LINE_WIDTH,
          "line-opacity": 0.95,
        },
      });

      map.addLayer({
        id: "risk-zones-highlight",
        type: "line",
        source: "risk-zones",
        paint: {
          "line-color": "#1e293b",
          "line-width": 2.5,
          "line-opacity": 0.9,
        },
        filter: ["==", ["get", "id"], "__none__"],
      });

      // ----------------------------------------------------------
      // VILLAGES / SCHOOLS (unchanged data, restyled for the light basemap)
      // ----------------------------------------------------------

      map.addLayer({
        id: "villages",
        type: "circle",
        source: "villages",
        // Only past a middling zoom — at the regional overview these just add noise.
        minzoom: 8,
        paint: {
          "circle-radius": 3.5,
          "circle-color": "#64748b",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
        },
      });

      map.addLayer({
        id: "schools",
        type: "circle",
        source: "schools",
        minzoom: 8,
        paint: {
          "circle-radius": 3.5,
          "circle-color": "#7c3aed",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
        },
      });

      // ----------------------------------------------------------
      // MODERATE / LOW INCIDENTS — clustered (critical/high stay as
      // always-visible DOM markers, added further below).
      // ----------------------------------------------------------

      map.addSource("incident-clusters", {
        type: "geojson",
        data: clusterGeoJSON(clusterableEntries, layersRef.current),
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 13,
      });

      map.addLayer({
        id: "incident-clusters-circle",
        type: "circle",
        source: "incident-clusters",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#FB8C00",
          "circle-opacity": 0.9,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-radius": [
            "step",
            ["get", "point_count"],
            14,
            5,
            18,
            15,
            23,
          ],
        },
      });

      map.addLayer({
        id: "incident-clusters-count",
        type: "symbol",
        source: "incident-clusters",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 11,
          "text-font": ["Noto Sans Bold"],
        },
        paint: {
          "text-color": "#08100d",
        },
      });

      map.addLayer({
        id: "incident-clusters-unclustered",
        type: "circle",
        source: "incident-clusters",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 6,
          "circle-color": ["coalesce", ["get", "color"], "#F4B400"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
        },
      });

      // ----------------------------------------------------------
      // GEOGRAPHIC LABELS toggle — dark charcoal with a soft light halo so
      // place names stay readable over terrain and risk-zone tinting.
      // ----------------------------------------------------------

      for (const layer of map.getStyle().layers) {
        if (layer.type === "symbol") {
          try {
            map.setPaintProperty(layer.id, "text-color", "#334155");
            map.setPaintProperty(layer.id, "text-halo-color", "rgba(255,255,255,0.85)");
            map.setPaintProperty(layer.id, "text-halo-width", 1.4);
          } catch {
            // Some symbol layers (icons only) have no text paint props — ignore.
          }
        }
      }

      // ----------------------------------------------------------
      // INTELLIGENCE MARKERS — GIS incidents, sensors, security events
      // ----------------------------------------------------------

      for (const inc of criticalHighEntries) {
        addMarker(`incident:${inc.id}`, "incident", inc.lngLat, inc.name, inc.severity);
      }
      for (const s of sensorEntries) {
        addMarker(`sensor:${s.id}`, "sensor", s.lngLat, s.name, null, s.kind, s.status);
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

        showSearchResult: (result) => {
          searchMarker?.remove();
          const el = buildMarkerEl({
            color: "#22c55e",
            animated: true,
            isSensor: false,
            iconKind: "pin",
            extraClass: "is-active",
          });
          searchMarker = new MLMarker({ element: el, anchor: "bottom" })
            .setLngLat([result.lon, result.lat])
            .addTo(map);

          const targetZoom = ZOOM_BY_CATEGORY[result.category] ?? 11;
          if (result.boundingBox) {
            const [west, south, east, north] = result.boundingBox;
            map.fitBounds(
              [
                [west, south],
                [east, north],
              ],
              { padding: 80, pitch: 0, bearing: 0, duration: 1200, maxZoom: targetZoom },
            );
          } else {
            map.flyTo({
              center: [result.lon, result.lat],
              zoom: targetZoom,
              pitch: 45,
              duration: 1200,
              essential: true,
            });
          }
        },

        clearSearchResult: () => {
          searchMarker?.remove();
          searchMarker = null;
        },
      });

      // ----------------------------------------------------------
      // CLUSTER INTERACTION — expand on click, open incidents on leaf click
      // ----------------------------------------------------------

      map.on("click", "incident-clusters-circle", (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0] as MapGeoJSONFeature | undefined;
        const clusterId = feature?.properties?.cluster_id as number | undefined;
        if (!feature || clusterId === undefined) return;
        const source = map.getSource("incident-clusters") as GeoJSONSource;
        source
          .getClusterExpansionZoom(clusterId)
          .then((zoom) => {
            map.easeTo({
              center: (feature.geometry as GeoJSON.Point).coordinates as [number, number],
              zoom,
              duration: 500,
            });
          })
          .catch(() => {});
      });

      map.on("click", "incident-clusters-unclustered", (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0] as MapGeoJSONFeature | undefined;
        const props = feature?.properties as { id: string } | undefined;
        if (!feature || !props) return;
        const point = map.project(
          (feature.geometry as GeoJSON.Point).coordinates as LngLatLike,
        );
        setPopup({ kind: "incident", id: `incident:${props.id}`, x: point.x, y: point.y });
      });

      for (const layerId of ["incident-clusters-circle", "incident-clusters-unclustered"]) {
        map.on("mouseenter", layerId, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = "";
        });
      }

      // ----------------------------------------------------------
      // RISK ZONE HOVER — subtle highlight + tooltip
      // ----------------------------------------------------------

      let hoveredZoneFeatureId: number | null = null;

      map.on("mousemove", "risk-zones-fill", (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0] as MapGeoJSONFeature | undefined;
        if (!feature || feature.id === undefined) return;
        if (hoveredZoneFeatureId !== null && hoveredZoneFeatureId !== feature.id) {
          map.setFeatureState({ source: "risk-zones", id: hoveredZoneFeatureId }, { hover: false });
        }
        hoveredZoneFeatureId = feature.id as number;
        map.setFeatureState({ source: "risk-zones", id: hoveredZoneFeatureId }, { hover: true });
        const props = feature.properties as { name: string; band: Severity };
        setHoverTooltip({ x: event.point.x, y: event.point.y, name: props.name, band: props.band });
      });

      map.on("mouseleave", "risk-zones-fill", () => {
        if (hoveredZoneFeatureId !== null) {
          map.setFeatureState({ source: "risk-zones", id: hoveredZoneFeatureId }, { hover: false });
        }
        hoveredZoneFeatureId = null;
        setHoverTooltip(null);
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
            ? infraVisible(rec.infraKind)
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
      searchMarker?.remove();

      map.remove();

      mapRef.current = null;
      readyRef.current = false;
    };

    // Map intentionally initializes once; `events`/`layers` are applied via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------------------------------------------
  // LIVE INCIDENTS — adds a marker for any incident not already rendered by
  // the seed INCIDENT_POINTS pass above (same "incident:<id>" key, so seed
  // incidents never double-render; only genuinely new ones — e.g. from the
  // Report Incident form — get added here as they're created).
  // --------------------------------------------------------------

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current || !incidentsProp) return;
    const markers = markersRef.current;

    for (const inc of incidentsProp) {
      const key = `incident:${inc.id}`;
      if (!inc.lngLat || markers.has(key)) continue;

      const color = SEVERITY[inc.severity].hex;
      const animated = inc.severity === "critical" || inc.severity === "high";
      const el = buildMarkerEl({
        color,
        animated,
        isSensor: false,
        iconKind: severityIconKind(inc.severity),
      });

      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const point = map.project(inc.lngLat as LngLatLike);
        setPopup((prev) => (prev?.id === key ? null : { kind: "incident", id: key, x: point.x, y: point.y }));
        onIncidentSelect?.(inc.id);
      });

      const marker = new MLMarker({ element: el, anchor: "center" }).setLngLat(inc.lngLat).addTo(map);
      markers.set(key, { id: key, kind: "incident", severity: inc.severity, title: inc.title, marker, lngLat: inc.lngLat });
    }

    applyMarkerVisibilityRef.current();
  }, [incidentsProp, onIncidentSelect]);

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

    const clusterSource = map.getSource("incident-clusters") as GeoJSONSource | undefined;
    clusterSource?.setData(clusterGeoJSON(clusterEntriesRef.current, layers));

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
      const incId = popup.id.split(":")[1];
      // Real incident data (title/location/category/summary/status) when the
      // caller passes the live incidents prop; falls back to the minimal
      // seed-only feature for the homepage preview, which has none.
      const incident = incidentsProp?.find((i) => i.id === incId);
      if (incident) {
        return {
          kind: "incident" as const,
          incident: {
            name: incident.title,
            band: incident.severity,
            location: incident.location,
            category: incident.category,
            summary: incident.summary,
            status: incident.status,
          },
        };
      }
      const feature = INCIDENT_POINTS.features.find(
        (f) => (f.properties as { id: string }).id === incId,
      );
      if (!feature) return null;
      const p = feature.properties as { name: string; band: Severity };
      return {
        kind: "incident" as const,
        incident: {
          name: p.name,
          band: p.band,
          location: "Sikkim GIS Sector",
          category: "Disaster Risk Incident",
          summary: "Field-reported incident within an active risk zone.",
          status: "new",
        },
      };
    }
    const s = [...HOSPITALS, ...BRIDGES, ...DEPOTS].find((p) => p.id === popup.id.split(":")[1]);
    return s ? { kind: "sensor" as const, sensor: s } : null;
  }, [popup, events, incidentsProp]);

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

      {hoverTooltip && !popup && (
        <div
          className="map-card pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px]"
          style={{ left: hoverTooltip.x, top: hoverTooltip.y }}
        >
          <span className={cn("font-semibold", SEVERITY[hoverTooltip.band].text)}>
            {SEVERITY[hoverTooltip.band].label} Risk
          </span>
          <span className="text-slate-500"> · {hoverTooltip.name}</span>
        </div>
      )}
    </div>
  );
}

// ================================================================
// LAYER VISIBILITY (GL style layers)
// ================================================================

const HAZARD_TYPES = ["landslide", "flood", "fire", "earthquake"];

function applyLayerVisibility(map: MLMap, layers: Record<string, boolean>) {
  const groups: Record<string, string[]> = {
    "risk-zones": ["risk-zones-fill", "risk-zones-glow", "risk-zones-line", "risk-zones-highlight"],
    rainfall: ["rainfall"],
    roads: ["roads", "roads-casing"],
    rivers: ["rivers", "rivers-casing"],
    villages: ["villages"],
    schools: ["schools"],
    "evacuation-routes": ["evacuation-routes"],
  };

  for (const [key, layerIds] of Object.entries(groups)) {
    const visible = layers[key] !== false;
    for (const layerId of layerIds) {
      if (!map.getLayer(layerId)) continue;
      map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
    }
  }

  // Independently-toggleable hazard categories, derived from each risk zone's
  // own `hazard` field — never a duplicated/fabricated layer.
  const activeHazards = HAZARD_TYPES.filter((h) => layers[`hazard-${h}`] !== false);
  const hazardFilter =
    activeHazards.length === HAZARD_TYPES.length
      ? undefined
      : (["in", ["get", "hazard"], ["literal", activeHazards]] as unknown as Parameters<
          typeof map.setFilter
        >[1]);
  for (const layerId of ["risk-zones-fill", "risk-zones-glow", "risk-zones-line"]) {
    if (!map.getLayer(layerId)) continue;
    map.setFilter(layerId, hazardFilter);
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

/** Infrastructure kind → popup glyph (mirrors the marker's own icon choice). */
const INFRA_POPUP_ICON: Record<string, LucideIcon> = {
  hospital: Hospital,
  bridge: Route,
  depot: Home,
};

const STATUS_LABEL: Record<string, string> = {
  normal: "Normal",
  warning: "Warning",
  damaged: "Damaged",
  blocked: "Blocked",
};

type PopupData =
  | { kind: "event"; event: TimelineEvent }
  | {
      kind: "incident";
      incident: { name: string; band: Severity; location: string; category: string; summary: string; status: string };
    }
  | { kind: "sensor"; sensor: { id: string; name: string; kind: string; status?: InfraStatus } };

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
    const inc = data.incident;
    title = inc.name;
    severity = inc.band;
    location = inc.location;
    detail1 = { label: "Category", value: inc.category };
    description = inc.summary;
    status = inc.status.charAt(0).toUpperCase() + inc.status.slice(1);
    Icon = TriangleAlert;
  } else {
    const sensor = data.sensor;
    title = sensor.name;
    location = "Infrastructure Network";
    detail1 = { label: "Category", value: sensor.kind };
    description =
      sensor.kind === "bridge"
        ? "River-crossing infrastructure — condition tracked against nearby hazard zones."
        : sensor.kind === "hospital"
          ? "Medical facility available for casualty response."
          : "Relief / staging depot for emergency response.";
    status = sensor.status ? STATUS_LABEL[sensor.status] : "Normal";
    Icon = INFRA_POPUP_ICON[sensor.kind] ?? RadioTower;
  }

  const infraStatusAccent =
    data.kind === "sensor" && data.sensor.status ? BRIDGE_STATUS_COLOR[data.sensor.status] : undefined;
  const accent = severity ? SEVERITY[severity].hex : (infraStatusAccent ?? "#22c55e");

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
      className="map-card z-30 w-56 rounded-xl p-3"
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
          <p className="truncate text-[12px] font-semibold text-slate-900">{title}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close intelligence popup"
          className="shrink-0 text-slate-400 hover:text-slate-800"
        >
          <X size={13} />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
        <MapPin size={10} className="shrink-0 text-slate-400" />
        <span className="truncate">{location}</span>
      </div>

      {(detail1 || detail2) && (
        <dl className="mt-1.5 space-y-1 text-[10px]">
          {detail1 && (
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">{detail1.label}</dt>
              <dd className="truncate text-slate-800">{detail1.value}</dd>
            </div>
          )}
          {detail2 && (
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">{detail2.label}</dt>
              <dd className="numeric text-slate-800">{detail2.value}</dd>
            </div>
          )}
        </dl>
      )}

      {description && (
        <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">{description}</p>
      )}

      {status && (
        <div className="mt-1.5 flex items-center justify-between border-t border-slate-900/8 pt-1.5">
          <span className="text-[9px] uppercase tracking-wider text-slate-400">Status</span>
          <span className="text-[10px] font-medium text-slate-800">{status}</span>
        </div>
      )}
    </motion.div>
  );
}
