"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Siren, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ESCALATION_ALERTS } from "@/data/alerts";
import { acknowledgeAlert } from "@/services/ops";
import { SEVERITY, cn } from "@/lib/utils";

/**
 * Real-time escalation alerts. Surfaces queued escalations one at a time with
 * an acknowledge interaction; advances to the next after a short delay.
 */
export function AlertSystem() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const timers = useRef<number[]>([]);

  const alert = ESCALATION_ALERTS[index];

  const dismiss = (ack: boolean) => {
    if (ack) void acknowledgeAlert(alert.id);
    setVisible(false);
    if (index < ESCALATION_ALERTS.length - 1) {
      const t = window.setTimeout(() => {
        setIndex((i) => i + 1);
        setVisible(true);
      }, 6000);
      timers.current.push(t);
    }
  };

  // Surface the first alert shortly after load; auto-retire it if not actioned.
  useEffect(() => {
    const show = window.setTimeout(() => setVisible(true), 5200);
    timers.current.push(show);
    const captured = timers.current;
    return () => {
      captured.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const auto = window.setTimeout(() => dismiss(false), 9000);
    return () => clearTimeout(auto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, index]);

  if (!alert) return null;
  const from = SEVERITY[alert.from];
  const to = SEVERITY[alert.to];

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[60] w-[340px] max-w-[calc(100vw-2rem)]">
      <AnimatePresence>
        {visible && (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: 40, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="glass-float pointer-events-auto overflow-hidden rounded-xl border border-sev-critical/30"
          >
            <span className="absolute inset-x-0 top-0 h-0.5 bg-sev-critical crit-pulse" />
            <div className="flex items-start gap-3 p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sev-critical/12 text-sev-critical">
                <Siren size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sev-critical">
                    Risk Escalated
                  </p>
                  <button
                    onClick={() => dismiss(false)}
                    aria-label="Dismiss alert"
                    className="text-fg-dim transition-colors hover:text-fg"
                  >
                    <X size={14} />
                  </button>
                </div>
                <p className="mt-1 text-[13px] font-semibold text-fg">
                  {alert.zone}
                </p>

                <div className="mt-2 flex items-center gap-2 text-[11px]">
                  <span className={cn("font-semibold", from.text)}>
                    {from.label}
                  </span>
                  <ArrowRight size={12} className="text-fg-dim" />
                  <span className={cn("font-semibold", to.text)}>
                    {to.label}
                  </span>
                </div>

                <p className="mt-2 text-[11px] leading-snug text-fg-muted">
                  <span className="text-fg-dim">Cause · </span>
                  {alert.cause}
                </p>
                <p className="mt-1 text-[11px] leading-snug text-fg-muted">
                  <span className="text-fg-dim">Action · </span>
                  {alert.action}
                </p>

                <button
                  onClick={() => dismiss(true)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold text-fg transition-colors hover:bg-white/[0.12]"
                >
                  <Check size={12} /> Acknowledge
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
