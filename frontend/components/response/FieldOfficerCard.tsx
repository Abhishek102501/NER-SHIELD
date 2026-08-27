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
      <div className="card-marketing p-6 bg-canvas">
        <div className="mb-4 flex items-center justify-between">
          <span className="caption-mono text-mute">FIELD REPORT · CAPTURE</span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border",
              online
                ? "bg-canvas-soft-2 text-link border-hairline"
                : "bg-canvas-soft-2 text-warning border-hairline",
            )}
          >
            {online ? <Wifi size={11} /> : <CloudOff size={11} />}
            {online ? "Online" : "Offline"}
          </span>
        </div>

        <div className="space-y-3">
          {CAPTURE_FIELDS.map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-3 rounded-lg border border-hairline bg-canvas-soft-2 px-3.5 py-2.5"
            >
              <span className="grid h-8 w-8 place-items-center rounded bg-canvas text-ink border border-hairline">
                <f.icon size={15} />
              </span>
              <div>
                <span className="caption-mono text-mute block text-[10px]">
                  {f.label}
                </span>
                <p className="body-sm font-medium text-ink">{f.value}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 body-sm text-body leading-relaxed">
          Reports are captured on-device and stored locally when connectivity
          drops — then synced automatically once a link returns.
        </p>
      </div>

      {/* Sync queue */}
      <div className="card-marketing p-6 bg-canvas">
        <div className="mb-4 flex items-center justify-between">
          <span className="caption-mono text-mute">SYNC QUEUE</span>
          <span className="caption-mono text-ink font-semibold">
            {pending} PENDING
          </span>
        </div>

        <ul className="space-y-2.5">
          {reports.map((r) => {
            const s = SEVERITY[r.severity];
            return (
              <li
                key={r.id}
                className="flex items-center gap-3 rounded-lg border border-hairline bg-canvas-soft-2 px-3.5 py-2.5"
              >
                <span className={cn("h-2 w-2 shrink-0 rounded-full", s.dot)} />
                <div className="min-w-0 flex-1">
                  <p className="numeric truncate body-sm font-semibold text-ink">
                    {r.id} · {r.incidentType}
                  </p>
                  <p className="numeric truncate caption-mono text-mute text-[10px]">
                    {r.gps}
                  </p>
                </div>
                <SyncBadge status={r.status} />
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex gap-2">
          <button
            onClick={runSync}
            disabled={syncing || pending === 0}
            className="button-primary inline-flex flex-1 items-center justify-center gap-2 text-sm disabled:opacity-40"
          >
            {syncing ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Syncing…
              </>
            ) : (
              <>
                <RefreshCw size={14} /> Sync Now
              </>
            )}
          </button>
          <button
            onClick={goOffline}
            className="button-secondary inline-flex items-center justify-center gap-2 text-sm"
          >
            <CloudOff size={14} /> Go Offline
          </button>
        </div>
      </div>
    </div>
  );
}

function SyncBadge({ status }: { status: SyncStatus }) {
  const map = {
    offline: { label: "Offline", cls: "text-mute", icon: CloudOff },
    queued: { label: "Queued", cls: "text-warning", icon: CloudOff },
    syncing: { label: "Syncing", cls: "text-link", icon: Loader2 },
    synced: { label: "Synced", cls: "text-ink", icon: Check },
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
          "inline-flex items-center gap-1 caption-mono text-[10px] font-semibold",
          map.cls,
        )}
      >
        <Icon size={11} className={status === "syncing" ? "animate-spin" : ""} />
        {map.label}
      </motion.span>
    </AnimatePresence>
  );
}

