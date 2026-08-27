"use client";

import { PanelLeftClose, Radio } from "lucide-react";
import { IncidentList } from "@/components/dashboard/IncidentList";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { SYSTEM_METRICS, SYSTEM_STATUS } from "@/data/system";

export function OperationsPanel({ onCollapse }: { onCollapse: () => void }) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-4 py-3">
        <div>
          <h2 className="text-[13px] font-bold tracking-wide text-fg">
            Operations
          </h2>
          <p className="eyebrow mt-1">Command Overview</p>
        </div>
        <button
          onClick={onCollapse}
          aria-label="Collapse operations panel"
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-fg-muted transition-colors hover:bg-white/5 hover:text-fg"
        >
          <PanelLeftClose size={15} />
        </button>
      </div>

      {/* Scroll body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <section>
          <p className="eyebrow mb-2.5">System Status</p>
          <div className="grid grid-cols-2 gap-2">
            {SYSTEM_METRICS.map((m, i) => (
              <MetricCard key={m.id} metric={m} index={i} />
            ))}
          </div>
        </section>

        <section className="mt-5">
          <div className="mb-2.5 flex items-center justify-between">
            <p className="eyebrow">Recent Incidents</p>
            <span className="inline-flex items-center gap-1 text-[10px] text-fg-dim">
              <Radio size={10} className="text-sev-low" />
              {SYSTEM_STATUS.dataFreshness}
            </span>
          </div>
          <IncidentList />
        </section>
      </div>
    </div>
  );
}
