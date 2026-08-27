"use client";

import { motion } from "framer-motion";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type MotionButtonProps = ComponentProps<typeof motion.button>;

interface IconButtonProps extends MotionButtonProps {
  children: ReactNode;
  label: string;
  active?: boolean;
  size?: "sm" | "md";
}

/** Square glassy control button used across the map + top bar. */
export function IconButton({
  children,
  label,
  active = false,
  size = "md",
  className,
  ...rest
}: IconButtonProps) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 400, damping: 26 }}
      className={cn(
        "grid place-items-center rounded-lg border text-fg-muted transition-colors",
        "hover:text-fg hover:border-white/20 hover:bg-white/5",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
        size === "md" ? "h-9 w-9" : "h-8 w-8",
        active
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-white/10 bg-white/[0.02]",
        className,
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
