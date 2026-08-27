"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Building2, MapPin, Send, Users } from "lucide-react";
import { useState } from "react";
import { RESPONSE_INCIDENTS } from "@/data/response";
import { SEVERITY, cn } from "@/lib/utils";

export function ResponsePriority() {
  const [id, setId] = useState(RESPONSE_INCIDENTS[0].id);
  const featured =
    RESPONSE_INCIDENTS.find((i) => i.id === id) ?? RESPONSE_INCIDENTS[0];
  const sev = SEVERITY[featured.severity];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {/* Featured incident */}
      <div className="lg:col-span-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={featured.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "relative h-full overflow-hidden rounded-2xl border bg-white/[0.02] p-6",
              sev.border,
            )}
          >
            <span className={cn("absolute inset-x-0 top-0 h-0.5", sev.dot)} />
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
                  sev.bgSoft,
                  sev.text,
                  featured.severity === "critical" && "crit-pulse",
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", sev.dot)} />
                {sev.label} Incident
              </span>
              <span className="numeric text-[11px] text-fg-dim">
                Priority #{featured.priority}
              </span>
            </div>

            <h3 className="mt-4 text-xl font-semibold text-fg">
              {featured.title}
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-fg-muted">
              <MapPin size={13} className="text-accent" />
              {featured.location}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Risk Score" value={`${featured.riskScore}%`} accent={sev.text} />
              <Metric
                label="Population"
                value={featured.populationExposure.toLocaleString()}
                icon={<Users size={12} />}
              />
              <Metric
                label="Infrastructure"
                value={featured.infrastructureExposure}
                icon={<Building2 size={12} />}
                wide
              />
            </div>

            <div className={cn("mt-5 rounded-xl border p-3", sev.border, sev.bgSoft)}>
              <p className="eyebrow mb-1">Recommended Action</p>
              <p className="text-[13px] font-medium text-fg">
                {featured.recommendedAction}
              </p>
            </div>

            <button className="mt-4 inline-flex items-center gap-2 rounded-lg bg-sev-critical px-4 py-2.5 text-[13px] font-semibold text-white transition-transform hover:-translate-y-0.5">
              <Send size={14} /> Dispatch response
            </button>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Queue */}
      <div className="lg:col-span-2">
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
          <p className="eyebrow px-2 py-2">Priority Queue</p>
          <ul className="space-y-1.5">
            {RESPONSE_INCIDENTS.map((inc) => {
              const s = SEVERITY[inc.severity];
              const active = inc.id === id;
              return (
                <li key={inc.id}>
                  <button
                    onClick={() => setId(inc.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                      active
                        ? "border-white/20 bg-white/[0.05]"
                        : "border-transparent hover:bg-white/[0.03]",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold",
                        s.bgSoft,
                        s.text,
                      )}
                    >
                      {inc.priority}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-fg">
                        {inc.location}
                      </p>
                      <p className="truncate text-[11px] text-fg-muted">
                        {inc.title}
                      </p>
                    </div>
                    <span className={cn("numeric text-[13px] font-semibold", s.text)}>
                      {inc.riskScore}%
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
  icon,
  wide,
}: {
  label: string;
  value: string;
  accent?: string;
  icon?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn("rounded-lg bg-white/[0.03] px-3 py-2", wide && "col-span-2")}>
      <p className="flex items-center gap-1 text-[9px] uppercase tracking-[0.12em] text-fg-dim">
        {icon}
        {label}
      </p>
      <p className={cn("numeric mt-0.5 text-sm font-semibold text-fg", accent)}>
        {value}
      </p>
    </div>
  );
}
