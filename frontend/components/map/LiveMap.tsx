"use client";

import {
  Map as MLMap,
  NavigationControl,
  type MapGeoJSONFeature,
  type MapLayerMouseEvent,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import {
  INCIDENT_POINTS,
  INFRASTRUCTURE,
  MAP_CENTER,
  MAP_ZOOM,
  RAINFALL_OVERLAY,
  RISK_ZONES,
  RIVERS,
  ROADS,
  VILLAGES,
} from "@/data/geo";
import type { RiskZone } from "@/types";

const BASE_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "bg",
      type: "background",
      paint: { "background-color": "#060a14" },
    },
  ],
};

interface LiveMapProps {
  className?: string;
  onZoneSelect?: (zone: RiskZone | null) => void;
  selectedZoneId?: string | null;
  layers?: Record<string, boolean>;
}

const DEFAULT_LAYERS = {
  "risk-zones": true,
  rainfall: true,
  roads: true,
  rivers: true,
  villages: true,
  infrastructure: true,
  incidents: true,
};

export default function LiveMap({
  className,
  onZoneSelect,
  selectedZoneId,
  layers = DEFAULT_LAYERS,
}: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const readyRef = useRef(false);

  // init once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new MLMap({
      container: containerRef.current,
      style: BASE_STYLE,
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      minZoom: 7,
      maxZoom: 14,
      attributionControl: false,
      pitch: 0,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: true }), "bottom-right");
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

    map.on("load", () => {
      // sources
      map.addSource("risk-zones", { type: "geojson", data: RISK_ZONES });
      map.addSource("rainfall", { type: "geojson", data: RAINFALL_OVERLAY });
      map.addSource("roads", { type: "geojson", data: ROADS });
      map.addSource("rivers", { type: "geojson", data: RIVERS });
      map.addSource("villages", { type: "geojson", data: VILLAGES });
      map.addSource("infrastructure", { type: "geojson", data: INFRASTRUCTURE });
      map.addSource("incidents", { type: "geojson", data: INCIDENT_POINTS });

      // rainfall heatmap (under everything)
      map.addLayer({
        id: "rainfall",
        type: "heatmap",
        source: "rainfall",
        paint: {
          "heatmap-weight": ["get", "intensity"],
          "heatmap-intensity": 0.8,
          "heatmap-radius": 46,
          "heatmap-opacity": 0.45,
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.3, "rgba(34,211,238,0.35)",
            0.6, "rgba(56,189,248,0.5)",
            0.8, "rgba(249,115,22,0.6)",
            1, "rgba(239,68,68,0.7)",
          ],
        },
      });

      // rivers + roads
      map.addLayer({
        id: "rivers",
        type: "line",
        source: "rivers",
        paint: { "line-color": "#2a6cff", "line-width": 2.5, "line-opacity": 0.55 },
      });
      map.addLayer({
        id: "roads",
        type: "line",
        source: "roads",
        paint: {
          "line-color": "#8aa0bf",
          "line-width": ["case", ["==", ["get", "cls"], "national"], 3, 1.6],
          "line-opacity": 0.7,
        },
      });

      // risk zones fill + outline
      map.addLayer({
        id: "risk-zones-fill",
        type: "fill",
        source: "risk-zones",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0.16,
        },
      });
      map.addLayer({
        id: "risk-zones-line",
        type: "line",
        source: "risk-zones",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 1.5,
          "line-opacity": 0.7,
        },
      });
      map.addLayer({
        id: "risk-zones-highlight",
        type: "line",
        source: "risk-zones",
        paint: { "line-color": "#ffffff", "line-width": 2.5, "line-opacity": 0.9 },
        filter: ["==", ["get", "id"], "__none__"],
      });

      // villages + infrastructure
      map.addLayer({
        id: "villages",
        type: "circle",
        source: "villages",
        paint: {
          "circle-radius": 4,
          "circle-color": "#cbd5e1",
          "circle-stroke-color": "#0b1120",
          "circle-stroke-width": 1.5,
        },
      });
      map.addLayer({
        id: "infrastructure",
        type: "circle",
        source: "infrastructure",
        paint: {
          "circle-radius": 5,
          "circle-color": "#22d3ee",
          "circle-stroke-color": "#0b1120",
          "circle-stroke-width": 1.5,
        },
      });

      // incidents (pulsing look via two layers)
      map.addLayer({
        id: "incidents-halo",
        type: "circle",
        source: "incidents",
        paint: {
          "circle-radius": 12,
          "circle-color": ["get", "color"],
          "circle-opacity": 0.18,
        },
      });
      map.addLayer({
        id: "incidents",
        type: "circle",
        source: "incidents",
        paint: {
          "circle-radius": 5,
          "circle-color": ["get", "color"],
          "circle-stroke-color": "#0b1120",
          "circle-stroke-width": 1.5,
        },
      });

      readyRef.current = true;
      applyLayerVisibility(map, layers);

      // interactions
      map.on("click", "risk-zones-fill", (e: MapLayerMouseEvent) => {
        const f = e.features?.[0] as MapGeoJSONFeature | undefined;
        if (f && onZoneSelect) onZoneSelect(f.properties as unknown as RiskZone);
      });
      map.on("mouseenter", "risk-zones-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "risk-zones-fill", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    // keep the canvas sized to its container (e.g. when side panels collapse)
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // react to selected zone highlight
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    if (map.getLayer("risk-zones-highlight")) {
      map.setFilter("risk-zones-highlight", [
        "==",
        ["get", "id"],
        selectedZoneId ?? "__none__",
      ]);
    }
  }, [selectedZoneId]);

  // react to layer visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    applyLayerVisibility(map, layers);
  }, [layers]);

  return <div ref={containerRef} className={className} />;
}

function applyLayerVisibility(
  map: MLMap,
  layers: Record<string, boolean>,
) {
  const groups: Record<string, string[]> = {
    "risk-zones": ["risk-zones-fill", "risk-zones-line", "risk-zones-highlight"],
    rainfall: ["rainfall"],
    roads: ["roads"],
    rivers: ["rivers"],
    villages: ["villages"],
    infrastructure: ["infrastructure"],
    incidents: ["incidents", "incidents-halo"],
  };
  for (const [key, ids] of Object.entries(groups)) {
    const visible = layers[key] !== false;
    for (const id of ids) {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
      }
    }
  }
}
