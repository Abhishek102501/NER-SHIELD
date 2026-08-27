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
            className="card-marketing p-6 relative overflow-hidden bg-canvas"
          >
            <span className={cn("absolute inset-x-0 top-0 h-1", sev.dot)} />
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 caption-mono text-[10px] font-semibold",
                  sev.bgSoft,
                  sev.text
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", sev.dot)} />
                {sev.label} INCIDENT
              </span>
              <span className="caption-mono text-mute">
                PRIORITY #{featured.priority}
              </span>
            </div>

            <h3 className="mt-4 display-sm text-ink">
              {featured.title}
            </h3>
            <p className="mt-1 flex items-center gap-1.5 body-sm text-body">
              <MapPin size={14} className="text-primary" />
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

            <div className="mt-5 rounded-lg border border-hairline bg-canvas-soft-2 p-4">
              <span className="caption-mono text-mute mb-1 block">RECOMMENDED ACTION</span>
              <p className="body-sm font-medium text-ink">
                {featured.recommendedAction}
              </p>
            </div>

            <button className="mt-5 button-primary inline-flex items-center gap-2">
              <Send size={14} /> Dispatch Response Unit
            </button>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Queue */}
      <div className="lg:col-span-2">
        <div className="card-marketing p-4 bg-canvas">
          <span className="caption-mono text-mute mb-3 block px-2">PRIORITY QUEUE</span>
          <ul className="space-y-2">
            {RESPONSE_INCIDENTS.map((inc) => {
              const s = SEVERITY[inc.severity];
              const active = inc.id === id;
              return (
                <li key={inc.id}>
                  <button
                    onClick={() => setId(inc.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all cursor-pointer",
                      active
                        ? "border-primary bg-canvas shadow-sm"
                        : "border-hairline bg-canvas-soft hover:border-hairline-strong hover:bg-canvas"
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-7 w-7 shrink-0 place-items-center rounded text-xs font-semibold numeric",
                        s.bgSoft,
                        s.text
                      )}
                    >
                      {inc.priority}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate body-sm font-semibold text-ink">
                        {inc.location}
                      </p>
                      <p className="truncate body-sm text-body">
                        {inc.title}
                      </p>
                    </div>
                    <span className={cn("numeric body-sm font-semibold", s.text)}>
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
    <div className={cn("rounded-md border border-hairline bg-canvas-soft-2 px-3 py-2", wide && "col-span-2")}>
      <span className="caption-mono text-mute flex items-center gap-1 text-[10px]">
        {icon}
        {label}
      </span>
      <p className={cn("numeric mt-1 body-md font-semibold text-ink", accent)}>
        {value}
      </p>
    </div>
  );
}

