"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  ChevronDown,
  ClipboardList,
  LogOut,
  MapPinned,
  RotateCcw,
  Settings,
  Shield,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { StatusIndicator } from "@/components/dashboard/StatusIndicator";
import { AuditLogModal } from "@/components/system/AuditLogModal";
import { SYSTEM_STATUS } from "@/data/system";
import { useCommand } from "@/lib/command-context";
import { SEVERITY, cn } from "@/lib/utils";

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const initialUpdate = setTimeout(() => setNow(new Date()), 0);
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearTimeout(initialUpdate);
      clearInterval(id);
    };
  }, []);
  const time = now
    ? now.toLocaleTimeString("en-GB", { hour12: false })
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

function DemoBadge() {
  return (
    <span
      className="hidden items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-accent md:inline-flex"
      title="This environment runs on simulated demo/training data, not live operational feeds."
    >
      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      Demo
    </span>
  );
}

function NotificationsButton() {
  const {
    notificationsOpen,
    setNotificationsOpen,
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
  } = useCommand();

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
          <DemoBadge />
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
  const { session, sessionLoading, logout, openResetConfirm } = useCommand();

  const name = session?.name ?? (sessionLoading ? "…" : "Guest");
  const role = session?.role ?? "";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const items: {
    icon: typeof UserRound;
    label: string;
    action?: () => void;
    disabledReason?: string;
  }[] = [
    {
      icon: UserRound,
      label: "Profile",
      disabledReason: "Single demo identity — nothing else to view.",
    },
    {
      icon: Settings,
      label: "Account Settings",
      disabledReason: "Not available on a demo/training account.",
    },
    {
      icon: ClipboardList,
      label: "Demo Controls",
      action: () => {
        setAuditOpen(true);
        setOpen(false);
      },
    },
    {
      icon: RotateCcw,
      label: "Reset Demo Data",
      action: () => {
        openResetConfirm();
        setOpen(false);
      },
    },
    {
      icon: LogOut,
      label: "Logout",
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
                <button
                  key={it.label}
                  onClick={it.action}
                  disabled={!it.action}
                  title={it.disabledReason}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[12px] text-fg-muted transition-colors hover:bg-white/5 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <it.icon size={14} />
                  <span className="flex-1">{it.label}</span>
                </button>
              ))}
              <p className="px-2 pt-1 text-[9px] text-fg-dim">{session?.accountType}</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AuditLogModal open={auditOpen} onClose={() => setAuditOpen(false)} />
    </div>
  );
}
