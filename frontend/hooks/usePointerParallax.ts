"use client";

import { useEffect } from "react";
import {
  useMotionValue,
  useReducedMotion,
  useSpring,
  type MotionValue,
} from "framer-motion";

/**
 * Window-level pointer parallax, normalized to roughly [-0.5, 0.5] on each axis.
 * Throttled to one update per animation frame; disabled under reduced motion.
 */
export function usePointerParallax(): {
  x: MotionValue<number>;
  y: MotionValue<number>;
} {
  const reduce = useReducedMotion();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 60, damping: 18, mass: 0.6 });
  const y = useSpring(rawY, { stiffness: 60, damping: 18, mass: 0.6 });

  useEffect(() => {
    if (reduce) return;
    let frame = 0;
    let nextX = 0;
    let nextY = 0;
    const onMove = (e: PointerEvent) => {
      nextX = e.clientX / window.innerWidth - 0.5;
      nextY = e.clientY / window.innerHeight - 0.5;
      if (!frame) {
        frame = requestAnimationFrame(() => {
          rawX.set(nextX);
          rawY.set(nextY);
          frame = 0;
        });
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reduce, rawX, rawY]);

  return { x, y };
}
