"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { REVEAL_VIEWPORT, fadeUp, staggerParent } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "left",
  className,
}: SectionHeaderProps) {
  return (
    <motion.div
      variants={staggerParent}
      initial="hidden"
      whileInView="show"
      viewport={REVEAL_VIEWPORT}
      className={cn(
        "flex flex-col gap-3",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      <motion.span
        variants={fadeUp}
        className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.03] px-3 py-1"
        style={align === "center" ? { alignSelf: "center" } : undefined}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-fg-muted">
          {eyebrow}
        </span>
      </motion.span>
      <motion.h2
        variants={fadeUp}
        className="max-w-2xl text-balance text-3xl font-semibold leading-[1.1] tracking-tight text-fg sm:text-4xl"
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          variants={fadeUp}
          className="max-w-xl text-pretty text-sm leading-relaxed text-fg-muted sm:text-[15px]"
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}
