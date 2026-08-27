"use client";

import { useEffect, useRef } from "react";
import { animate, useInView } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
  /** Zero-pad to N integer digits (e.g. 2 → "03"). */
  pad?: number;
}

/** Counts up to `value` once it scrolls into view. Respects reduced motion. */
export function AnimatedNumber({
  value,
  decimals = 0,
  duration = 1.1,
  className,
  suffix = "",
  prefix = "",
  pad,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });

  const format = (n: number) => {
    let s: string;
    if (pad && decimals === 0) {
      s = Math.round(n).toString().padStart(pad, "0");
    } else {
      s = n.toFixed(decimals);
    }
    return `${prefix}${s}${suffix}`;
  };

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!inView) {
      node.textContent = format(0);
      return;
    }
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      node.textContent = format(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        node.textContent = format(v);
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value]);

  return (
    <span ref={ref} className={className}>
      {format(0)}
    </span>
  );
}
