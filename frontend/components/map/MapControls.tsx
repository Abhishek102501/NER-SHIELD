"use client";

import { motion } from "framer-motion";
import { Compass, Crosshair, Minus, Plus, Search } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { REGION } from "@/data/region";
import { useCommand } from "@/lib/command-context";

export function MapControls() {
  const { zoom, zoomIn, zoomOut } = useCommand();

  return (
    <>
      {/* Location / search — top-left */}
      <div className="pointer-events-auto absolute left-3 top-3 z-10 hidden md:block">
        <button
          type="button"
          className="glass-float flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:border-white/20"
        >
          <Search size={14} className="text-fg-muted" />
          <span className="text-[12px] text-fg-muted">
            Search location or zone
          </span>
          <kbd className="numeric ml-2 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] text-fg-dim">
            /
          </kbd>
        </button>
      </div>

      {/* Zoom + compass — right middle */}
      <div className="pointer-events-auto absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-2">
        <div className="glass-float flex flex-col overflow-hidden rounded-lg p-1">
          <IconButton label="Zoom in" size="sm" onClick={zoomIn}>
            <Plus size={15} />
          </IconButton>
          <div className="my-1 h-px w-full bg-white/8" />
          <IconButton label="Zoom out" size="sm" onClick={zoomOut}>
            <Minus size={15} />
          </IconButton>
        </div>

        <div className="glass-float grid h-10 w-10 place-items-center rounded-lg">
          <motion.div
            whileHover={{ rotate: -8 }}
            transition={{ type: "spring", stiffness: 200, damping: 12 }}
            className="relative text-accent"
            title="Orientation · North up"
          >
            <Compass size={20} />
            <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[7px] font-bold text-sev-critical">
              N
            </span>
          </motion.div>
        </div>

        <IconButton label="Recenter on region" size="sm" className="glass-float">
          <Crosshair size={15} />
        </IconButton>
      </div>

      {/* Scale / zoom readout — bottom-right */}
      <div className="pointer-events-none absolute bottom-3 right-3 z-10 flex flex-col items-end gap-1.5">
        <div className="glass-float numeric rounded-md px-2 py-1 text-[10px] text-fg-muted">
          ZOOM {zoom.toFixed(1)} · {REGION.centroid}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-[3px] w-12 rounded-full bg-white/40" />
          <span className="numeric text-[9px] text-fg-dim">10 km</span>
        </div>
      </div>
    </>
  );
}
