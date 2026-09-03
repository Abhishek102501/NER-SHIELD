"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  CheckCheck,
  CircleCheck,
  Loader,
  MapPin,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { RESPONSE_INCIDENTS } from "@/data/response";
import type { ResponseStatus } from "@/types";
import { SEVERITY, cn } from "@/lib/utils";

const STATUS_META: Record<
  ResponseStatus,
  { label: string; cls: string; dot: string }
> = {
  new: { label: "New", cls: "text-fg-dim", dot: "bg-fg-dim" },
  assigned: { label: "Assigned", cls: "text-accent", dot: "bg-accent" },
  acknowledged: {
    label: "Acknowledged",
    cls: "text-sev-moderate",
    dot: "bg-sev-moderate",
  },
  "in-progress": {
    label: "In Progress",
    cls: "text-sev-high",
    dot: "bg-sev-high",
  },
  resolved: { label: "Resolved", cls: "text-sev-low", dot: "bg-sev-low" },
};

const ACTIONS: {
  status: ResponseStatus;
  label: string;
  icon: typeof UserPlus;
}[] = [
  { status: "assigned", label: "Assign", icon: UserPlus },
  { status: "acknowledged", label: "Acknowledge", icon: CheckCheck },
  { status: "in-progress", label: "Mark In Progress", icon: Loader },
  { status: "resolved", label: "Resolve", icon: CircleCheck },
];

export function ResponsePriority() {
  const [id, setId] = useState(RESPONSE_INCIDENTS[0].id);
  const [statuses, setStatuses] = useState<Record<string, ResponseStatus>>(() =>
    Object.fromEntries(RESPONSE_INCIDENTS.map((i) => [i.id, "new"])),
  );

  const featured =
    RESPONSE_INCIDENTS.find((i) => i.id === id) ?? RESPONSE_INCIDENTS[0];
  const sev = SEVERITY[featured.severity];
  const status = statuses[featured.id] ?? "new";
  const meta = STATUS_META[status];

  const setStatus = (s: ResponseStatus) =>
    setStatuses((prev) => ({ ...prev, [featured.id]: s }));

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
            <div className="flex items-center justify-between gap-2">
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
              <div className="flex items-center gap-2">
                {/* Live status pill */}
                <AnimatePresence mode="wait">
                  <motion.span
                    key={status}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold",
                      meta.cls,
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                    {meta.label}
                  </motion.span>
                </AnimatePresence>
                <span className="numeric text-[11px] text-fg-dim">
                  #{featured.priority}
                </span>
              </div>
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

            {/* Response actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              {ACTIONS.map((a) => {
                const active = status === a.status;
                return (
                  <button
                    key={a.status}
                    onClick={() => setStatus(a.status)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12px] font-semibold transition-colors",
                      active
                        ? "border-transparent bg-accent text-black"
                        : "border-white/12 text-fg-muted hover:border-white/25 hover:text-fg",
                    )}
                  >
                    <a.icon size={13} />
                    {a.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] text-fg-dim">
              SIMULATED dispatch · no responder is actually notified
            </p>
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
              const st = STATUS_META[statuses[inc.id] ?? "new"];
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
                      <p className="flex items-center gap-1.5 text-[11px] text-fg-muted">
                        <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
                        <span className={st.cls}>{st.label}</span>
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
