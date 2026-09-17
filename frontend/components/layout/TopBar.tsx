"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  ChevronDown,
  ClipboardList,
  DatabaseZap,
  LogOut,
  MapPinned,
  RotateCcw,
  Settings,
  Shield,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { StatusIndicator } from "@/components/dashboard/StatusIndicator";
import { AccountSettingsModal } from "@/components/system/AccountSettingsModal";
import { AuditLogModal } from "@/components/system/AuditLogModal";
import { ProfileModal } from "@/components/system/ProfileModal";
import { SYSTEM_STATUS } from "@/data/system";
import { useCommand } from "@/lib/command-context";
import { useAccountSettings } from "@/lib/settings";
import { SEVERITY, cn } from "@/lib/utils";

const SEVERITY_RANK: Record<string, number> = { low: 0, moderate: 1, high: 2, critical: 3 };
const MIN_SEVERITY_RANK: Record<string, number> = { all: -1, moderate: 1, critical: 3 };

/** Honest provenance breakdown for the mixed data this platform serves.
 * The app itself is operational (see StatusIndicator above) — this is a
 * separate, deliberately unglamorous panel so no single source's status
 * gets generalized to "the whole app is live" or "the whole app is a demo". */
const DATA_SOURCES: { tag: string; label: string; detail: string; tone: "real" | "derived" | "seed" | "mock" }[] = [
  {
    tag: "REAL_EXTERNAL",
    label: "Live external feeds",
    detail: "Open-Meteo weather + trained rainfall/landslide ML inference.",
    tone: "real",
  },
  {
    tag: "DATABASE_BACKED",
    label: "Persisted operational data",
    detail: "Incidents, dispatches and response units in PostgreSQL/PostGIS.",
    tone: "real",
  },
  {
    tag: "USER_GENERATED",
    label: "User-generated",
    detail: "Field reports and incidents created in this session.",
    tone: "real",
  },
  {
    tag: "DERIVED",
    label: "Derived layers",
    detail: "GIS overlays computed from the above, not raw sensor output.",
    tone: "derived",
  },
  {
    tag: "DEMO_SEED",
    label: "Seeded demo data",
    detail: "Illustrative threats/risk zones shipped for the walkthrough.",
    tone: "seed",
  },
  {
    tag: "MOCK",
    label: "Mock authentication",
    detail: "Single demo Duty Officer session — no real identity provider.",
    tone: "mock",
  },
];

const TONE_DOT: Record<string, string> = {
  real: "bg-sev-low",
  derived: "bg-accent",
  seed: "bg-sev-moderate",
  mock: "bg-fg-dim",
};

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  const [{ clockFormat }] = useAccountSettings();
  useEffect(() => {
    const initialUpdate = setTimeout(() => setNow(new Date()), 0);
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearTimeout(initialUpdate);
      clearInterval(id);
    };
  }, []);
  const time = now
    ? now.toLocaleTimeString("en-GB", { hour12: clockFormat === "12h" })
    : "--:--:--";
  const date = now
    ? now.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      })
    : "--";
  return (
    <div className="hidden flex-col items-end leading-tight sm:flex">
      <span className="numeric text-[13px] font-semibold text-fg">{time}</span>
      <span className="numeric text-[9px] uppercase tracking-wider text-fg-dim">
        {date} · IST
      </span>
    </div>
  );
}

function DataProvenanceMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="This platform mixes live external data, persisted operational data and seeded demo data — see breakdown."
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] transition-colors",
          open
            ? "border-accent/50 bg-accent/15 text-accent"
            : "border-white/15 bg-white/5 text-fg-muted hover:text-fg",
        )}
      >
        <DatabaseZap size={11} />
        Data Sources
        <ChevronDown size={10} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button
              aria-label="Close data sources panel"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-30 cursor-default"
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="glass-float absolute left-0 top-[calc(100%+10px)] z-40 w-80 rounded-xl p-3"
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="eyebrow">Data provenance</span>
                <span className="text-[9px] font-semibold text-sev-low">SYSTEM OPERATIONAL</span>
              </div>
              <p className="mb-2 px-1 text-[11px] leading-snug text-fg-muted">
                The platform is online. Individual data sources below keep their honest
                classification — nothing here is presented as more &ldquo;live&rdquo; than it is.
              </p>
              <ul className="space-y-1.5">
                {DATA_SOURCES.map((s) => (
                  <li key={s.tag} className="flex items-start gap-2 rounded-lg px-1 py-1">
                    <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", TONE_DOT[s.tone])} />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-fg">
                        {s.label}{" "}
                        <span className="text-[9px] font-mono font-normal text-fg-dim">{s.tag}</span>
                      </p>
                      <p className="text-[10.5px] leading-snug text-fg-muted">{s.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationsButton() {
  const {
    notificationsOpen,
    setNotificationsOpen,
    notifications: allNotifications,
    markNotificationRead,
    markAllNotificationsRead,
  } = useCommand();
  const [{ minNotificationSeverity }] = useAccountSettings();

  const minRank = MIN_SEVERITY_RANK[minNotificationSeverity] ?? -1;
  const notifications = allNotifications.filter(
    (n) => (SEVERITY_RANK[n.severity] ?? 0) >= minRank,
  );
  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setNotificationsOpen(!notificationsOpen)}
        aria-label="Notifications"
        className={cn(
          "relative grid h-9 w-9 place-items-center rounded-lg border transition-colors",
          notificationsOpen
            ? "border-accent/40 bg-accent/10 text-accent"
            : "border-white/10 text-fg-muted hover:bg-white/5 hover:text-fg",
        )}
      >
        <Bell size={16} />
        {unreadNotificationCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-sev-critical px-1 text-[9px] font-bold text-white">
            {unreadNotificationCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {notificationsOpen && (
          <>
            <button
              aria-label="Close notifications"
              onClick={() => setNotificationsOpen(false)}
              className="fixed inset-0 z-30 cursor-default"
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="glass-float absolute right-0 top-[calc(100%+10px)] z-40 w-80 rounded-xl p-2"
            >
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="eyebrow">Notifications</span>
                {unreadNotificationCount > 0 ? (
                  <button
                    onClick={markAllNotificationsRead}
                    className="flex items-center gap-1 text-[10px] font-medium text-accent hover:text-accent-2"
                  >
                    <CheckCheck size={11} /> Mark all read
                  </button>
                ) : (
                  <span className="numeric text-[10px] text-fg-dim">All read</span>
                )}
              </div>
              <ul className="max-h-80 space-y-1 overflow-y-auto">
                {notifications.map((n) => {
                  const sev = SEVERITY[n.severity];
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => markNotificationRead(n.id)}
                        className={cn(
                          "flex w-full gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5",
                          !n.read && "bg-white/[0.03]",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-1 h-2 w-2 shrink-0 rounded-full",
                            n.read ? "bg-white/15" : sev.dot,
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={cn(
                                "truncate text-[12px]",
                                n.read ? "font-normal text-fg-muted" : "font-medium text-fg",
                              )}
                            >
                              {n.title}
                            </p>
                            <span className="numeric shrink-0 text-[10px] text-fg-dim">
                              {n.timeAgo}
                            </span>
                          </div>
                          <p className="text-[11px] leading-snug text-fg-muted">
                            {n.detail}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TopBar() {
  return (
    <header className="glass relative z-40 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-white/8 px-4">
      {/* Left — wordmark */}
      <Link
        href="/"
        aria-label="Go to NER-SHIELD homepage"
        className="flex items-center gap-3"
      >
        <div className="relative grid h-9 w-9 place-items-center rounded-lg border border-accent/30 bg-accent/10 text-accent">
          <Shield size={18} strokeWidth={2.2} />
        </div>
        <div className="leading-none">
          <h1 className="text-[15px] font-bold tracking-tight text-fg">
            NER<span className="text-accent">-</span>SHIELD
          </h1>
          <p className="mt-1 hidden text-[9px] uppercase tracking-[0.22em] text-fg-dim md:block">
            Disaster Intelligence
          </p>
        </div>
      </Link>

      {/* Center — tagline (only when there is guaranteed room) */}
      <div className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 min-[1440px]:block">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-fg-muted">
          AI-Powered Disaster Intelligence
        </p>
      </div>

      {/* Right — status cluster */}
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-3 md:flex">
          <StatusIndicator label={SYSTEM_STATUS.label} online />
          <span className="h-4 w-px bg-white/10" />
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-fg-muted">
            <MapPinned size={13} className="text-accent/70" />
            {SYSTEM_STATUS.region}
          </span>
          <span className="h-4 w-px bg-white/10" />
          <DataProvenanceMenu />
          <span className="h-4 w-px bg-white/10" />
        </div>

        <LiveClock />
        <NotificationsButton />

        <ProfileMenu />
      </div>
    </header>
  );
}

function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { session, sessionLoading, logout, openResetConfirm } = useCommand();

  const name = session?.name ?? (sessionLoading ? "…" : "Guest");
  const role = session?.role ?? "";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  type MenuItem = {
    icon: typeof UserRound;
    label: string;
    action: () => void;
    /** Groups items visually with a divider + section eyebrow above the first item in the group. */
    section?: string;
  };

  const items: MenuItem[] = [
    {
      icon: UserRound,
      label: "Profile",
      action: () => {
        setProfileOpen(true);
        setOpen(false);
      },
    },
    {
      icon: Settings,
      label: "Account Settings",
      action: () => {
        setSettingsOpen(true);
        setOpen(false);
      },
    },
    {
      icon: ClipboardList,
      label: "Activity Log",
      action: () => {
        setAuditOpen(true);
        setOpen(false);
      },
    },
    {
      icon: RotateCcw,
      label: "Reset Demo Data",
      section: "Demo & dev tools",
      action: () => {
        openResetConfirm();
        setOpen(false);
      },
    },
    {
      icon: LogOut,
      label: "Logout",
      section: "Session",
      action: () => {
        setOpen(false);
        logout();
      },
    },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 rounded-lg border py-1 pl-1 pr-2 transition-colors",
          open ? "border-accent/40 bg-white/5" : "border-white/10 hover:bg-white/5",
        )}
      >
        <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-accent/80 to-accent-deep text-[11px] font-bold text-black">
          {initials || "OC"}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-[11px] font-semibold text-fg">{name}</span>
          <span className="block text-[9px] text-fg-dim">{role}</span>
        </span>
        <ChevronDown
          size={13}
          className={cn("text-fg-dim transition-transform", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-30 cursor-default"
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="glass-float absolute right-0 top-[calc(100%+10px)] z-40 w-56 rounded-xl p-2"
            >
              <div className="px-2 py-1.5">
                <p className="text-[12px] font-semibold text-fg">{name}</p>
                <p className="text-[10px] text-fg-dim">{session?.organization}</p>
              </div>
              <div className="my-1 h-px bg-white/8" />
              {items.map((it) => (
                <div key={it.label}>
                  {it.section && (
                    <p className="mt-1 px-2 pb-1 pt-2 text-[9px] font-semibold uppercase tracking-wider text-fg-dim">
                      {it.section}
                    </p>
                  )}
                  <button
                    onClick={it.action}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[12px] text-fg-muted transition-colors hover:bg-white/5 hover:text-fg"
                  >
                    <it.icon size={14} />
                    <span className="flex-1">{it.label}</span>
                    {it.label === "Reset Demo Data" && (
                      <span className="rounded-full bg-sev-moderate/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-sev-moderate">
                        Demo
                      </span>
                    )}
                  </button>
                </div>
              ))}
              <p className="px-2 pt-1 text-[9px] text-fg-dim">{session?.accountType}</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <AccountSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AuditLogModal open={auditOpen} onClose={() => setAuditOpen(false)} />
    </div>
  );
}
