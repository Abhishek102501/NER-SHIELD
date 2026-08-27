"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { REVEAL_VIEWPORT, fadeUp } from "@/lib/motion";

/** Scroll-reveal wrapper — fades/rises children into view once. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={REVEAL_VIEWPORT}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}
