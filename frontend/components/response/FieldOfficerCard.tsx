"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  CheckCircle2,
  CloudOff,
  Loader2,
  MapPin,
  RefreshCw,
  ScanSearch,
  Send,
  Upload,
  Wifi,
} from "lucide-react";
import { useRef, useState } from "react";
import { FIELD_REPORTS } from "@/data/field";
import { VILLAGES } from "@/data/infrastructure";
import type { CvFinding, FieldReportDraft, Severity, SyncStatus } from "@/types";
import { SEVERITY, cn } from "@/lib/utils";

const INCIDENT_TYPES = [
  "Landslide",
  "Flood",
  "Road Obstruction",
  "Structural",
  "Other",
];
const SEVERITIES: Severity[] = ["low", "moderate", "high", "critical"];

const GPS_PRESETS = VILLAGES.map(
  (v) => `${v.center[1].toFixed(3)}°N, ${v.center[0].toFixed(3)}°E`,
);

/** DEMO computer-vision result, keyed loosely off the incident type. */
function analyze(type: string): CvFinding[] {
  switch (type) {
    case "Flood":
      return [
        { label: "Standing water detected", confidence: 82, severity: "high" },
        { label: "Road submersion indicator", confidence: 70, severity: "high" },
      ];
    case "Road Obstruction":
      return [
        { label: "Road blockage detected", confidence: 79, severity: "high" },
        { label: "Debris on carriageway", confidence: 72, severity: "moderate" },
      ];
    case "Structural":
      return [
        { label: "Structural cracking detected", confidence: 84, severity: "high" },
        { label: "Spalling / material loss", confidence: 61, severity: "moderate" },
      ];
    default:
      return [
        { label: "Possible surface cracks detected", confidence: 87, severity: "high" },
        { label: "Debris accumulation", confidence: 74, severity: "moderate" },
        { label: "Slope displacement indicator", confidence: 68, severity: "high" },
      ];
  }
}

type CvState = "idle" | "analyzing" | "done";

export function FieldOfficerCard() {
  // form state
  const [type, setType] = useState(INCIDENT_TYPES[0]);
  const [severity, setSeverity] = useState<Severity>("high");
  const [desc, setDesc] = useState("");
  const [gps, setGps] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [cvState, setCvState] = useState<CvState>("idle");
  const [findings, setFindings] = useState<CvFinding[]>([]);
  const [created, setCreated] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const gpsIdx = useRef(0);

  // queue state
  const [online, setOnline] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [reports, setReports] = useState<FieldReportDraft[]>(() =>
    FIELD_REPORTS.map((r) => ({ ...r })),
  );

  const setStatus = (id: string, status: SyncStatus) =>
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));

  const captureGps = () => {
    const next = GPS_PRESETS[gpsIdx.current % GPS_PRESETS.length];
    gpsIdx.current += 1;
    setGps(next);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));
    setCvState("analyzing");
    setFindings([]);
    window.setTimeout(() => {
      setFindings(analyze(type));
      setCvState("done");
    }, 1700);
  };

  const canSubmit = desc.trim().length > 2 && !!gps;

  const submit = () => {
    if (!canSubmit) return;
    const id = `FR-${1000 + Math.floor(Math.random() * 9000)}`;
    const draft: FieldReportDraft = {
      id,
      gps: gps!,
      incidentType: type,
      severity,
      evidenceCount: imageUrl ? 1 : 0,
      status: "queued",
      timeAgo: "just now",
    };
    setReports((prev) => [draft, ...prev]);
    setCreated(id);
    // LOCAL STORAGE → SYNCING → SYNCHRONIZED
    window.setTimeout(() => setStatus(id, "syncing"), 1400);
    window.setTimeout(() => setStatus(id, "synced"), 2600);
    // reset the form
    setDesc("");
    setGps(null);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setCvState("idle");
    setFindings([]);
    window.setTimeout(() => setCreated(null), 4000);
  };

  const runSync = () => {
    if (syncing) return;
    setOnline(true);
    setSyncing(true);
    const queued = reports.filter((r) => r.status === "queued");
    queued.forEach((r, i) => {
      window.setTimeout(() => setStatus(r.id, "syncing"), 250 + i * 600);
      window.setTimeout(() => {
        setStatus(r.id, "synced");
        if (i === queued.length - 1) setSyncing(false);
      }, 250 + i * 600 + 500);
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
      {/* Capture form */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="eyebrow text-accent/70">New Field Report</p>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold",
              online ? "bg-sev-low/10 text-sev-low" : "bg-sev-high/10 text-sev-high",
            )}
          >
            {online ? <Wifi size={11} /> : <CloudOff size={11} />}
            {online ? "Online" : "Offline"}
          </span>
        </div>

        {/* Incident type */}
        <p className="eyebrow mb-1.5">Incident Type</p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {INCIDENT_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                type === t
                  ? "border-accent/50 bg-accent/10 text-accent"
                  : "border-white/10 text-fg-muted hover:border-white/20",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Severity */}
        <p className="eyebrow mb-1.5">Severity</p>
        <div className="mb-3 grid grid-cols-4 gap-1.5">
          {SEVERITIES.map((s) => {
            const sv = SEVERITY[s];
            const on = severity === s;
            return (
              <button
                key={s}
                onClick={() => setSeverity(s)}
                className={cn(
                  "rounded-lg border py-1.5 text-[10px] font-semibold capitalize transition-colors",
                  on
                    ? cn(sv.bgSoft, sv.text, sv.border)
                    : "border-white/10 text-fg-muted hover:border-white/20",
                )}
              >
                {s}
              </button>
            );
          })}
        </div>

        {/* Description */}
        <p className="eyebrow mb-1.5">Description</p>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={2}
          placeholder="What did you observe on the ground?"
          className="mb-3 w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[12px] text-fg placeholder:text-fg-dim focus:border-accent/50 focus:outline-none"
        />

        {/* GPS + evidence */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            onClick={captureGps}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-left text-[11px] transition-colors hover:border-white/20"
          >
            <MapPin size={14} className={gps ? "text-sev-low" : "text-accent"} />
            <span className={gps ? "numeric text-fg" : "text-fg-muted"}>
              {gps ?? "Capture GPS"}
            </span>
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-left text-[11px] text-fg-muted transition-colors hover:border-white/20"
          >
            <Upload size={14} className="text-accent" />
            {imageUrl ? "Change image" : "Upload evidence"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onFile}
            className="hidden"
          />
        </div>

        {/* CV demo */}
        <AnimatePresence>
          {imageUrl && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 overflow-hidden"
            >
              <div className="flex gap-3 rounded-lg border border-white/10 bg-black/30 p-2.5">
                <div
                  className="h-16 w-16 shrink-0 rounded-md bg-cover bg-center"
                  style={{ backgroundImage: `url(${imageUrl})` }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <ScanSearch size={12} className="text-accent" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-accent">
                      AI Demonstration Result
                    </span>
                  </div>
                  {cvState === "analyzing" ? (
                    <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-fg-muted">
                      <Loader2 size={12} className="animate-spin" /> Analyzing
                      image…
                    </p>
                  ) : (
                    <ul className="mt-1.5 space-y-1">
                      {findings.map((f) => (
                        <li
                          key={f.label}
                          className="flex items-center justify-between gap-2 text-[11px]"
                        >
                          <span className="flex items-center gap-1.5 text-fg">
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                SEVERITY[f.severity].dot,
                              )}
                            />
                            {f.label}
                          </span>
                          <span className="numeric shrink-0 text-fg-dim">
                            {f.confidence}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit / confirmation */}
        <AnimatePresence mode="wait">
          {created ? (
            <motion.div
              key="created"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 rounded-lg border border-sev-low/30 bg-sev-low/10 px-3 py-2.5 text-[12px] text-sev-low"
            >
              <CheckCircle2 size={15} />
              <span className="font-semibold text-fg">
                Report Created ·{" "}
                <span className="numeric text-sev-low">{created}</span>
              </span>
              <span className="ml-auto text-[10px] text-fg-dim">
                syncing to queue…
              </span>
            </motion.div>
          ) : (
            <motion.button
              key="submit"
              onClick={submit}
              disabled={!canSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-[13px] font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={14} /> Submit Report
            </motion.button>
          )}
        </AnimatePresence>
        <p className="mt-2 text-[10px] text-fg-dim">
          MOCK submission · stored locally, not sent to authorities
        </p>
      </div>

      {/* Sync queue */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="eyebrow">Sync Queue</p>
          <span className="numeric text-[11px] text-fg-dim">{pending} pending</span>
        </div>

        <ul className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {reports.map((r) => {
              const s = SEVERITY[r.severity];
              return (
                <motion.li
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
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
                </motion.li>
              );
            })}
          </AnimatePresence>
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
                <RefreshCw size={13} /> Sync all
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
    offline: { label: "Local", cls: "text-fg-dim", icon: CloudOff },
    queued: { label: "Local", cls: "text-sev-high", icon: CloudOff },
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
        className={cn("inline-flex items-center gap-1 text-[10px] font-semibold", map.cls)}
      >
        <Icon size={11} className={status === "syncing" ? "animate-spin" : ""} />
        {map.label}
      </motion.span>
    </AnimatePresence>
  );
}
