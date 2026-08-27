"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { RISK_FACTORS } from "@/data/risk";
import { SEVERITY, cn } from "@/lib/utils";

export function RiskFactors() {
  const max = Math.max(...RISK_FACTORS.map((f) => f.weight));
  const [active, setActive] = useState<string | null>(null);

  return (
    <ul className="flex flex-col gap-2.5">
      {RISK_FACTORS.map((f, i) => {
        const sev = SEVERITY[f.severity];
        const isActive = active === f.id;
        return (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => setActive(isActive ? null : f.id)}
              className={cn(
                "w-full rounded-md px-1.5 py-1 text-left transition-colors",
                isActive ? "bg-white/[0.04]" : "hover:bg-white/[0.02]",
              )}
            >
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span
                  className={cn(
                    "font-medium",
                    isActive ? "text-fg" : "text-fg-muted",
                  )}
                >
                  {f.label}
                </span>
                <span className="numeric font-semibold text-fg">
                  {f.weight}%
                </span>
              </div>
              <div className="relative h-1.5 overflow-hidden rounded-full bg-white/8">
                <motion.div
                  className={cn("h-full rounded-full", sev.dot)}
                  initial={{ width: 0 }}
                  animate={{ width: `${(f.weight / max) * 100}%` }}
                  transition={{
                    duration: 0.9,
                    delay: 0.12 + i * 0.07,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  style={{
                    boxShadow: isActive ? `0 0 8px ${sev.hex}88` : "none",
                  }}
                />
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
