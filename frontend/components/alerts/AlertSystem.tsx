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
    <div className="pointer-events-none fixed right-4 top-20 z-[60] w-[350px] max-w-[calc(100vw-2rem)]">
      <AnimatePresence>
        {visible && (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: 40, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="pointer-events-auto overflow-hidden rounded-xl bg-canvas border border-hairline shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
          >
            <span className="absolute inset-x-0 top-0 h-1 bg-sev-critical" />
            <div className="flex items-start gap-3 p-4">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-sev-critical/10 text-sev-critical mt-0.5">
                <Siren size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="caption-mono text-sev-critical font-semibold">
                    RISK ESCALATED
                  </span>
                  <button
                    onClick={() => dismiss(false)}
                    aria-label="Dismiss alert"
                    className="text-mute hover:text-ink transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                <h4 className="mt-1 body-sm font-semibold text-ink">
                  {alert.zone}
                </h4>

                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className={cn("font-medium", from.text)}>
                    {from.label}
                  </span>
                  <ArrowRight size={12} className="text-mute" />
                  <span className={cn("font-medium", to.text)}>
                    {to.label}
                  </span>
                </div>

                <p className="mt-2 text-xs text-body leading-snug">
                  <span className="text-mute">Cause · </span>
                  {alert.cause}
                </p>
                <p className="mt-1 text-xs text-body leading-snug">
                  <span className="text-mute">Action · </span>
                  {alert.action}
                </p>

                <button
                  onClick={() => dismiss(true)}
                  className="mt-3 nav-cta-signup text-xs"
                >
                  <Check size={12} className="mr-1.5 inline" /> Acknowledge
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
