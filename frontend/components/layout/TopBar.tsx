"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, ChevronDown, MapPinned, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { StatusIndicator } from "@/components/dashboard/StatusIndicator";
import { NOTIFICATIONS } from "@/data/region";
import { SYSTEM_STATUS } from "@/data/system";
import { useCommand } from "@/lib/command-context";
import { SEVERITY, cn } from "@/lib/utils";

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
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

function NotificationsButton() {
  const { notificationsOpen, setNotificationsOpen } = useCommand();
  const unread = NOTIFICATIONS.length;
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
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-sev-critical px-1 text-[9px] font-bold text-white">
          {unread}
        </span>
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
                <span className="numeric text-[10px] text-fg-dim">
                  {unread} new
                </span>
              </div>
              <ul className="space-y-1">
                {NOTIFICATIONS.map((n) => {
                  const sev = SEVERITY[n.severity];
                  return (
                    <li key={n.id}>
                      <div className="flex gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-white/5">
                        <span
                          className={cn(
                            "mt-1 h-2 w-2 shrink-0 rounded-full",
                            sev.dot,
                          )}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[12px] font-medium text-fg">
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
                      </div>
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
      <div className="flex items-center gap-3">
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
      </div>

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
        </div>

        <LiveClock />
        <NotificationsButton />

        {/* Profile */}
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-white/10 py-1 pl-1 pr-2 transition-colors hover:bg-white/5"
        >
          <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-accent/80 to-accent-deep text-[11px] font-bold text-black">
            OC
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-[11px] font-semibold text-fg">
              Ops Command
            </span>
            <span className="block text-[9px] text-fg-dim">Duty Officer</span>
          </span>
          <ChevronDown size={13} className="text-fg-dim" />
        </button>
      </div>
    </header>
  );
}
