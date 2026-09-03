"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";

/** Animates to `value` every time it changes (e.g. when the location switches). */
export function LiveNumber({
  value,
  decimals = 0,
  suffix = "",
  pad,
  className,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  /** Zero-pad the integer part to N digits. */
  pad?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const fmt = (n: number) => {
      if (pad && decimals === 0) {
        return `${Math.round(n).toString().padStart(pad, "0")}${suffix}`;
      }
      return `${n.toFixed(decimals)}${suffix}`;
    };
    if (reduce) {
      node.textContent = fmt(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        node.textContent = fmt(v);
      },
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, decimals, suffix, pad, reduce]);

  const initial =
    pad && decimals === 0
      ? Math.round(value).toString().padStart(pad, "0")
      : value.toFixed(decimals);

  return (
    <span ref={ref} className={className}>
      {initial}
      {suffix}
    </span>
  );
}
