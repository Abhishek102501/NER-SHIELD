"use client";

import { motion } from "framer-motion";
import { NE_STATE_BOUNDARIES, makeNeProjector } from "@/data/ne-boundary";

const project = makeNeProjector(100, 100, 6);

/**
 * Glowing wireframe map of the seven North-East Indian states — real, simplified
 * geography (see data/ne-boundary.ts), not an abstract shape. Renders in a 0–100
 * viewBox so region labels / risk hotspots positioned in the same coordinate space
 * (via the same `project()`) land exactly on the correct state.
 */
export function NeMapVisual({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <filter id="ne-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <pattern id="ne-grid" width="3" height="3" patternUnits="userSpaceOnUse">
          <path d="M 3 0 L 0 0 0 3" fill="none" stroke="#22d3ee" strokeWidth="0.06" opacity="0.4" />
        </pattern>
      </defs>

      {NE_STATE_BOUNDARIES.map((s, i) => {
        const points = s.ring.map((p) => project(p).join(",")).join(" ");
        return (
          <motion.g
            key={s.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 + i * 0.07, ease: "easeOut" }}
          >
            <polygon points={points} fill="rgba(8,22,32,0.7)" />
            <polygon points={points} fill="url(#ne-grid)" />
            <polygon
              points={points}
              fill="rgba(34,211,238,0.05)"
              stroke="#22d3ee"
              strokeOpacity={0.55}
              strokeWidth={1.1}
              vectorEffect="non-scaling-stroke"
              filter="url(#ne-glow)"
              strokeLinejoin="round"
            />
          </motion.g>
        );
      })}
    </svg>
  );
}
