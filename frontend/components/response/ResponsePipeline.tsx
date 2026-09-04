"use client";

import { motion } from "framer-motion";
import { Cpu, ListOrdered, Radar, Siren, type LucideIcon } from "lucide-react";
import { RESPONSE_PHASES } from "@/data/response";
import { REVEAL_VIEWPORT } from "@/lib/motion";
import type { ResponsePhase } from "@/types";

const ICONS: Record<ResponsePhase, LucideIcon> = {
  detect: Radar,
  assess: Cpu,
  prioritize: ListOrdered,
  respond: Siren,
};

export function ResponsePipeline() {
  return (
    <div className="card-marketing p-6 sm:p-8 bg-white/[0.02]">
      <span className="caption-mono text-fg-dim mb-5 block">OPERATING LOOP</span>
      <div className="relative">
        {/* connecting track */}
        <div className="absolute left-5 right-5 top-5 hidden h-px bg-hairline sm:block">
          <motion.div
            className="h-full bg-gradient-to-r from-accent via-sev-moderate to-sev-critical"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={REVEAL_VIEWPORT}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ originX: 0 }}
          />
        </div>

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {RESPONSE_PHASES.map((p, i) => {
            const Icon = ICONS[p.id];
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={REVEAL_VIEWPORT}
                transition={{ delay: 0.15 + i * 0.18, duration: 0.5 }}
                className="relative flex flex-col items-center text-center sm:items-start sm:text-left"
              >
                <span className="relative z-10 grid h-10 w-10 place-items-center rounded-full border border-hairline bg-white/5 text-accent shadow-sm">
                  <Icon size={17} />
                </span>
                <p className="mt-3 body-sm font-semibold text-fg">
                  {p.label}
                </p>
                <p className="mt-1 body-sm text-fg-muted leading-snug">
                  {p.blurb}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

