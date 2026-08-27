"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ZoneDetailPanel } from "@/components/map/ZoneDetailPanel";
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

/** The GIS map inside the command center — real MapLibre, wired to the layer control. */
export function CommandMap() {
  const { layers } = useCommand();
  const [zone, setZone] = useState<RiskZone | null>(null);

  // Map the command LayerControl toggles onto the live map's layer groups.
  const liveLayers = useMemo(
    () => ({
      "risk-zones": layers["risk-zones"] !== false,
      rainfall: true,
      roads: layers["roads"] !== false,
      rivers: layers["rivers"] !== false,
      villages: layers["villages"] !== false,
      infrastructure:
        layers["hospitals"] !== false || layers["bridges"] !== false,
      incidents: layers["incidents"] !== false,
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
      />
      <ZoneDetailPanel zone={zone} onClose={() => setZone(null)} />
    </div>
  );
}
