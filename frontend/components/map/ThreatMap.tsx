"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPinOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import {
  summarizeThreats,
  type ThreatEvent,
  type ThreatRisk,
  type ThreatSummary,
} from "@/data/threats";
import { getThreats, type ThreatDataSource } from "@/services/threats";
import { cn } from "@/lib/utils";

// Leaflet's default marker images resolve relative to the bundler's asset
// path and 404 under Next.js/Vite unless the icon URLs are rebuilt from the
// installed package — the classic "broken marker" issue. We never fall back
// to the default icon (every marker below uses a custom divIcon), but fixing
// it here keeps Leaflet's own internals (e.g. attribution, edge cases) from
// ever requesting a missing image.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "leaflet/dist/images/marker-icon-2x.png",
  iconUrl: "leaflet/dist/images/marker-icon.png",
  shadowUrl: "leaflet/dist/images/marker-shadow.png",
});

const RISK_COLOR: Record<ThreatRisk, string> = {
  high: "#ef4444",
  medium: "#f97316",
  low: "#22c55e",
};

const RISK_LABEL: Record<ThreatRisk, string> = {
  high: "High Risk",
  medium: "Medium Risk",
  low: "Low Risk",
};

function buildMarkerIcon(risk: ThreatRisk): L.DivIcon {
  const color = RISK_COLOR[risk];
  return L.divIcon({
    className: "ns-threat-marker",
    html: `<span class="ns-threat-marker-dot" style="--marker-color:${color}"><span class="pulse-ring"></span></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

const MAP_CENTER: [number, number] = [25.8, 92.5];
const MAP_ZOOM = 6;

/** A threat event that has real coordinates to plot — never a guessed location. */
type MappableThreatEvent = ThreatEvent & { latitude: number; longitude: number };

function isMappable(t: ThreatEvent): t is MappableThreatEvent {
  return t.locationAvailable && typeof t.latitude === "number" && typeof t.longitude === "number";
}

interface ThreatMapProps {
  className?: string;
  /** Called once threat data resolves (or changes), for a parent summary strip. */
  onThreatsChange?: (
    threats: ThreatEvent[],
    summary: ThreatSummary,
    source: ThreatDataSource,
  ) => void;
  /** Which risk tiers to render; defaults to all. */
  visibleRisks?: Record<ThreatRisk, boolean>;
}

const ALL_VISIBLE: Record<ThreatRisk, boolean> = {
  high: true,
  medium: true,
  low: true,
};

export default function ThreatMap({
  className,
  onThreatsChange,
  visibleRisks = ALL_VISIBLE,
}: ThreatMapProps) {
  const [threats, setThreats] = useState<ThreatEvent[]>([]);
  const [source, setSource] = useState<ThreatDataSource>("demo");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getThreats().then(({ events, source }) => {
      if (cancelled) return;
      setThreats(events);
      setSource(source);
      setLoaded(true);
      onThreatsChange?.(events, summarizeThreats(events), source);
    });

    return () => {
      cancelled = true;
    };
    // Fetched once; parent re-derives filtering client-side.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Never plot an event without real coordinates — no location is invented here.
  const mappable = useMemo(() => threats.filter(isMappable), [threats]);
  const visible = useMemo(
    () => mappable.filter((t) => visibleRisks[t.risk] !== false),
    [mappable, visibleRisks],
  );
  const showEmptyState = loaded && mappable.length === 0;

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        minZoom={4}
        maxZoom={14}
        zoomControl={false}
        attributionControl={false}
        className={cn("ns-threatmap", className)}
        style={{ width: "100%", height: "100%", background: "#060a14" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          subdomains={["a", "b", "c"]}
          attribution="&copy; OpenStreetMap contributors"
        />

        {visible.map((threat) => (
          <Marker
            key={threat.id}
            position={[threat.latitude, threat.longitude]}
            icon={buildMarkerIcon(threat.risk)}
          >
            <Popup className="ns-threat-popup" closeButton={false}>
              <div className="w-[240px]">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="eyebrow"
                    style={{ color: RISK_COLOR[threat.risk] }}
                  >
                    {RISK_LABEL[threat.risk]}
                  </span>
                  {source === "demo" && (
                    <span className="rounded bg-white/10 px-1 py-0.5 text-[8px] font-bold tracking-widest text-fg-dim">
                      DEMO
                    </span>
                  )}
                </div>
                <h4 className="mt-1 text-sm font-semibold text-fg">
                  {threat.threatName}
                </h4>
                <dl className="mt-2 space-y-1 text-[11px] text-fg-muted">
                  <div className="flex justify-between gap-3">
                    <dt className="text-fg-dim">Entity Type</dt>
                    <dd className="text-fg">{threat.entity}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-fg-dim">Location</dt>
                    <dd className="text-right text-fg">{threat.location}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-fg-dim">Detected</dt>
                    <dd className="numeric text-fg">
                      {new Date(threat.timestamp).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </dd>
                  </div>
                </dl>
                <p className="mt-2 text-[11px] leading-relaxed text-fg-muted">
                  {threat.description}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {showEmptyState && (
        <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center">
          <div className="glass-float pointer-events-none flex flex-col items-center gap-2 rounded-xl px-5 py-4 text-center">
            <MapPinOff size={18} className="text-fg-dim" />
            <p className="text-[12px] font-medium text-fg-muted">
              No mappable threat events
            </p>
            <p className="max-w-[220px] text-[10px] leading-relaxed text-fg-dim">
              {threats.length > 0
                ? "Detected events exist but none carry a known geographic location."
                : "No threat events reported."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
