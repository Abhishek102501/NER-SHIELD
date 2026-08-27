"use client";

import { motion } from "framer-motion";
import { Layers3, Radar } from "lucide-react";
import { INCIDENTS } from "@/data/incidents";
import { MAP_NODES, REGION } from "@/data/region";
import { useCommand } from "@/lib/command-context";
import { SEVERITY, cn } from "@/lib/utils";

/** Which layer toggle gates each node kind (placeholder wiring). */
const KIND_LAYER: Record<(typeof MAP_NODES)[number]["kind"], string> = {
  zone: "risk-zones",
  sensor: "sensors",
  asset: "villages",
};

export function MapShell() {
  const { layers, selectIncident, selectedIncidentId } = useCommand();

  return (
    <div className="map-grid sweep absolute inset-0 overflow-hidden">
      {/* Topographic-inspired contour lines (abstract, not real terrain) */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.5]"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
        aria-hidden
      >
        <g fill="none" stroke="#38bdf8" strokeOpacity="0.12" strokeWidth="0.15">
          <path d="M-5,30 C20,20 35,42 55,34 C75,26 90,40 105,32" />
          <path d="M-5,45 C18,36 38,55 58,46 C78,38 92,52 105,45" />
          <path d="M-5,60 C22,52 36,70 56,60 C76,50 90,64 105,58" />
          <path d="M-5,74 C20,66 40,82 60,73 C80,64 94,76 105,70" />
          <path d="M-5,88 C24,80 38,94 58,86 C78,78 92,88 105,84" />
        </g>
        <g fill="none" stroke="#22d3ee" strokeOpacity="0.16" strokeWidth="0.2">
          {/* Abstract region outline */}
          <path d="M20,26 C34,18 52,20 66,24 C80,28 84,44 80,58 C76,72 60,82 44,80 C28,78 18,66 16,52 C14,40 12,32 20,26 Z" />
        </g>
      </svg>

      {/* Edge coordinate ticks (indicative framing only) */}
      <div className="numeric pointer-events-none absolute inset-0 text-[9px] text-accent/30">
        <span className="absolute left-3 top-2">{REGION.bbox.north}</span>
        <span className="absolute bottom-2 left-3">{REGION.bbox.south}</span>
        <span className="absolute right-3 top-2">{REGION.bbox.east}</span>
        <span className="absolute bottom-2 right-3">{REGION.bbox.west}</span>
      </div>

      {/* Radial vignette to focus the center */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(3,6,12,0.55)_100%)]" />

      {/* Location nodes */}
      {MAP_NODES.map((node) => {
        if (!layers[KIND_LAYER[node.kind]]) return null;
        const sev = SEVERITY[node.severity];
        const incident = INCIDENTS.find(
          (i) => i.x === node.x && i.y === node.y,
        );
        const selected = incident && incident.id === selectedIncidentId;
        const isZone = node.kind === "zone";
        return (
          <button
            key={node.id}
            type="button"
            onClick={() => incident && selectIncident(incident.id)}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            className={cn(
              "group absolute -translate-x-1/2 -translate-y-1/2",
              incident ? "cursor-pointer" : "cursor-default",
            )}
            aria-label={
              incident
                ? `${sev.label} zone — ${incident.location}`
                : `${node.kind} node`
            }
          >
            <span
              className={cn(
                "relative grid place-items-center",
                isZone ? "h-3 w-3" : "h-2 w-2",
                sev.text,
              )}
            >
              {node.severity === "critical" && (
                <span className="pulse-ring absolute inset-0 rounded-full bg-sev-critical/70" />
              )}
              <span
                className={cn(
                  "relative rounded-full ring-2 ring-black/40",
                  isZone ? "h-3 w-3" : "h-2 w-2",
                  sev.dot,
                  selected && "ring-white/70",
                )}
              />
            </span>
            {incident && (
              <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-black/80 px-2 py-1 text-[10px] text-fg opacity-0 transition-opacity group-hover:opacity-100">
                {incident.location}
              </span>
            )}
          </button>
        );
      })}

      {/* Center emblem — communicates the future live map */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center gap-3 text-center"
        >
          <div className="relative grid h-16 w-16 place-items-center rounded-2xl border border-accent/20 bg-accent/5 text-accent">
            <span className="pulse-ring absolute inset-0 rounded-2xl bg-accent/20" />
            <Radar size={26} className="relative" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide text-fg/90">
              {REGION.name}
            </p>
            <p className="eyebrow mt-1.5 flex items-center justify-center gap-1.5 text-accent/70">
              <Layers3 size={11} />
              Live GIS map · MapLibre integration in Milestone 2
            </p>
            <p className="numeric mt-1 text-[10px] text-fg-dim">
              {REGION.centroid} · {REGION.sector}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
