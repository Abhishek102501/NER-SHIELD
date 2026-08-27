"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  Check,
  CloudOff,
  Loader2,
  MapPin,
  RefreshCw,
  TriangleAlert,
  Wifi,
} from "lucide-react";
import { useState } from "react";
import { FIELD_REPORTS } from "@/data/field";
import type { FieldReportDraft, SyncStatus } from "@/types";
import { SEVERITY, cn } from "@/lib/utils";

const CAPTURE_FIELDS = [
  { icon: MapPin, label: "GPS Location", value: "27.176°N, 88.531°E" },
  { icon: Camera, label: "Evidence", value: "3 photos attached" },
  { icon: TriangleAlert, label: "Incident Type", value: "Landslide · Critical" },
];

export function FieldOfficerCard() {
  const [online, setOnline] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [reports, setReports] = useState<FieldReportDraft[]>(() =>
    FIELD_REPORTS.map((r) => ({ ...r })),
  );

  const setStatus = (id: string, status: SyncStatus) =>
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r)),
    );

  const runSync = () => {
    if (syncing) return;
    setOnline(true);
    setSyncing(true);
    const queued = reports.filter((r) => r.status === "queued");
    queued.forEach((r, i) => {
      window.setTimeout(() => setStatus(r.id, "syncing"), 250 + i * 700);
      window.setTimeout(() => {
        setStatus(r.id, "synced");
        if (i === queued.length - 1) setSyncing(false);
      }, 250 + i * 700 + 550);
    });
    if (queued.length === 0) setSyncing(false);
  };

  const goOffline = () => {
    setOnline(false);
    setReports((prev) =>
      prev.map((r) => (r.status === "synced" ? r : { ...r, status: "queued" })),
    );
  };

  const pending = reports.filter((r) => r.status !== "synced").length;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Capture */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="eyebrow text-accent/70">Field Report · Capture</p>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold",
              online
                ? "bg-sev-low/10 text-sev-low"
                : "bg-sev-high/10 text-sev-high",
            )}
          >
            {online ? <Wifi size={11} /> : <CloudOff size={11} />}
            {online ? "Online" : "Offline"}
          </span>
        </div>

        <div className="space-y-2">
          {CAPTURE_FIELDS.map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.04] text-accent">
                <f.icon size={15} />
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-fg-dim">
                  {f.label}
                </p>
                <p className="text-[12px] font-medium text-fg">{f.value}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-fg-muted">
          Reports are captured on-device and stored locally when connectivity
          drops — then synced automatically once a link returns.
        </p>
      </div>

      {/* Sync queue */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="eyebrow">Sync Queue</p>
          <span className="numeric text-[11px] text-fg-dim">
            {pending} pending
          </span>
        </div>

        <ul className="space-y-2">
          {reports.map((r) => {
            const s = SEVERITY[r.severity];
            return (
              <li
                key={r.id}
                className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5"
              >
                <span className={cn("h-2 w-2 shrink-0 rounded-full", s.dot)} />
                <div className="min-w-0 flex-1">
                  <p className="numeric truncate text-[12px] font-medium text-fg">
                    {r.id} · {r.incidentType}
                  </p>
                  <p className="numeric truncate text-[10px] text-fg-dim">
                    {r.gps}
                  </p>
                </div>
                <SyncBadge status={r.status} />
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex gap-2">
          <button
            onClick={runSync}
            disabled={syncing || pending === 0}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[12px] font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {syncing ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Syncing…
              </>
            ) : (
              <>
                <RefreshCw size={13} /> Sync now
              </>
            )}
          </button>
          <button
            onClick={goOffline}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/12 px-3 py-2 text-[12px] font-medium text-fg-muted transition-colors hover:bg-white/5 hover:text-fg"
          >
            <CloudOff size={13} /> Go offline
          </button>
        </div>
      </div>
    </div>
  );
}

function SyncBadge({ status }: { status: SyncStatus }) {
  const map = {
    offline: { label: "Offline", cls: "text-fg-dim", icon: CloudOff },
    queued: { label: "Queued", cls: "text-sev-high", icon: CloudOff },
    syncing: { label: "Syncing", cls: "text-accent", icon: Loader2 },
    synced: { label: "Synced", cls: "text-sev-low", icon: Check },
  }[status];
  const Icon = map.icon;
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={status}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          "inline-flex items-center gap-1 text-[10px] font-semibold",
          map.cls,
        )}
      >
        <Icon size={11} className={status === "syncing" ? "animate-spin" : ""} />
        {map.label}
      </motion.span>
    </AnimatePresence>
  );
}
