"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Layers } from "lucide-react";
import { LAYER_GROUPS, MAP_LAYERS } from "@/data/layers";
import { useCommand } from "@/lib/command-context";
import { cn } from "@/lib/utils";

export function LayerControl() {
  const { layers, toggleLayer, layerPanelOpen, setLayerPanelOpen } =
    useCommand();
  const activeCount = Object.values(layers).filter(Boolean).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setLayerPanelOpen(!layerPanelOpen)}
        aria-pressed={layerPanelOpen}
        className={cn(
          "glass-float flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors",
          layerPanelOpen
            ? "border-accent/40 text-accent"
            : "text-fg-muted hover:text-fg",
        )}
      >
        <Layers size={14} />
        <span>Layers</span>
        <span className="numeric rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-fg">
          {activeCount}
        </span>
      </button>

      <AnimatePresence>
        {layerPanelOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="glass-float absolute left-0 top-[calc(100%+8px)] z-20 w-60 rounded-xl p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="eyebrow">Map Layers</span>
              <button
                onClick={() => setLayerPanelOpen(false)}
                className="text-[10px] text-fg-dim hover:text-fg"
              >
                Done
              </button>
            </div>

            <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
              {LAYER_GROUPS.map((group) => (
                <div key={group.id}>
                  <p className="eyebrow mb-1.5 text-accent/60">{group.label}</p>
                  <ul className="space-y-0.5">
                    {MAP_LAYERS.filter((l) => l.group === group.id).map(
                      (layer) => {
                        const on = layers[layer.id];
                        return (
                          <li key={layer.id}>
                            <button
                              type="button"
                              onClick={() => toggleLayer(layer.id)}
                              className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-white/5"
                            >
                              <span
                                className={cn(
                                  "grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors",
                                  on
                                    ? "border-accent bg-accent/90 text-black"
                                    : "border-white/20 bg-transparent",
                                )}
                              >
                                {on && <Check size={11} strokeWidth={3} />}
                              </span>
                              <span
                                className={cn(
                                  "text-[12px]",
                                  on ? "text-fg" : "text-fg-muted",
                                )}
                              >
                                {layer.label}
                              </span>
                            </button>
                          </li>
                        );
                      },
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
