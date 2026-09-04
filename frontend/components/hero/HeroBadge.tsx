"use client";

import { motion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";

export function HeroBadge({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
      className="glass-float mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1.5"
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
        <span className="relative h-1.5 w-1.5 rounded-full bg-accent" />
      </span>
      <span className="caption-mono text-fg-muted">{children}</span>
    </motion.div>
  );
}
