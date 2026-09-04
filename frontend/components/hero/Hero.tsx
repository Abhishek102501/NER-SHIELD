"use client";

import { motion, useReducedMotion, useScroll } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Bell, Box, ChevronDown, MapPin, Satellite, ShieldAlert } from "lucide-react";
import { EASE_OUT } from "@/lib/motion";
import { HERO_HOTSPOTS } from "@/data/hero-feed";
import { NE_STATE_BOUNDARIES, makeNeProjector } from "@/data/ne-boundary";
import { CapabilityIndicators } from "./CapabilityIndicators";
import { HeroBadge } from "./HeroBadge";
import { HeroMetricCard } from "./HeroMetricCard";
import { AlertBarsGraph, SparklineGraph, ZonesGraph } from "./MetricGraph";
import { NeMapVisual } from "./NeMapVisual";
import { RiskHotspot } from "./RiskHotspot";

// Shared projector: the map SVG's viewBox and the DOM label/hotspot overlay both use
// this exact 0–100 space, so labels land precisely on their real state polygon.
const projectNe = makeNeProjector(100, 100, 6);

const HeroCanvas = dynamic(() => import("./HeroCanvas"), { ssr: false });

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  useEffect(() => setMounted(true), []);

  return (
    <section
      id="top"
      ref={sectionRef}
      className="relative flex min-h-[100vh] w-full flex-col justify-between overflow-hidden border-b border-white/5 bg-ink pb-14 pt-28 sm:pt-32"
    >
      {/* 3D WebGL Digital Twin Terrain Canvas Background */}
      <div className="absolute inset-0 z-0">
        {mounted && !reduce ? (
          <HeroCanvas scroll={scrollYProgress} />
        ) : (
          <div className="pointer-events-none absolute inset-0 map-grid opacity-60" />
        )}
      </div>

      {/* Legibility gradient: darker toward the text column and edges */}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-ink via-ink/55 to-ink/10" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-ink/40 via-transparent to-ink" />

      {/* Satellite decoration */}
      <div className="pointer-events-none absolute right-[6%] top-[9%] z-2 hidden flex-col items-end gap-1 lg:flex">
        <Satellite size={26} strokeWidth={1.2} className="rotate-18 text-fg-dim" />
        <span className="caption-mono text-right text-[9px] leading-tight text-fg-dim">
          REAL-TIME SATELLITE DATA
          <br />
          24/7 MONITORING
        </span>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6">
        {/* This row's own box is the coordinate space for the terrain overlay
            below — scoping it here (not the whole section) keeps region
            labels / hotspots out of the metric-cards row underneath. */}
        <div className="relative flex flex-col gap-10 lg:min-h-135 lg:flex-row lg:items-start lg:justify-between">
          {/* Glowing wireframe map of the real NE-India state boundaries — confined to
              the right portion of the row so it never sits under the text column. */}
          <div className="pointer-events-none absolute inset-y-0 left-[48%] right-0 z-0 hidden lg:block">
            <NeMapVisual className="h-full w-full opacity-90" />
          </div>

          {/* Region labels + risk hotspots — positioned by the SAME projector, in the
              SAME box, as the map above, so they land exactly on their real state/city. */}
          <div className="pointer-events-none absolute inset-y-0 left-[48%] right-0 z-2 hidden lg:block">
            {NE_STATE_BOUNDARIES.map((s, i) => {
              const [x, y] = projectNe(s.centroid);
              return (
                <motion.span
                  key={s.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.7 + i * 0.06 }}
                  className="numeric absolute -translate-x-1/2 text-[10px] tracking-[0.14em] text-fg-dim/80"
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  {s.name}
                </motion.span>
              );
            })}
            <div className="pointer-events-auto">
              {HERO_HOTSPOTS.map((h, i) => {
                const [x, y] = projectNe(h.lngLat);
                return <RiskHotspot key={h.id} hotspot={h} x={x} y={y} delay={0.9 + i * 0.15} />;
              })}
            </div>
          </div>

          {/* Left: headline column */}
          <div className="relative z-10 max-w-xl">
            <HeroBadge>SIH 2026 · AI DISASTER INTELLIGENCE PLATFORM</HeroBadge>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 }}
              className="text-balance text-5xl font-bold leading-[1.05] tracking-tight text-fg sm:text-6xl"
            >
              Predict disasters.
              <br />
              <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">
                Before they become disasters.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.2 }}
              className="mt-6 max-w-md text-pretty text-[15px] leading-relaxed text-fg-muted"
            >
              A multi-dimensional AI digital twin fusing real-time rainfall radar,
              slope stability, soil saturation, and satellite signals to detect and
              simulate disasters across North-East India.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.3 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Link href="/command" className="button-primary group">
                <span>Launch Command Center</span>
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
              </Link>

              <a href="#terrain" className="button-secondary group">
                <Box size={15} className="text-accent transition-transform group-hover:rotate-12" />
                <span>Explore Digital Twin</span>
              </a>
            </motion.div>

            <CapabilityIndicators />
          </div>
        </div>

        {/* 3-Up Premium Metric Cards */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.4 }}
          className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <HeroMetricCard
            index={0}
            icon={<ShieldAlert size={13} />}
            label="Peak Risk Index"
            value={
              <div className="flex items-baseline gap-2">
                <span className="numeric text-3xl font-bold text-fg">87.4%</span>
              </div>
            }
            meta={
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sev-critical">
                  ↑ 12.8%
                </span>
                <span className="text-[11px] text-fg-dim">from previous hour</span>
              </div>
            }
            graph={<SparklineGraph color="#ef4444" />}
          />

          <HeroMetricCard
            index={1}
            icon={<Bell size={13} />}
            label="Active Alerts"
            value={<span className="numeric text-3xl font-bold text-fg">14</span>}
            meta={
              <div className="flex items-center gap-2.5 text-[10.5px] text-fg-dim">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-sev-critical" /> 8 High
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-sev-moderate" /> 4 Medium
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-2" /> 2 Low
                </span>
              </div>
            }
            graph={<AlertBarsGraph high={8} medium={4} low={2} />}
          />

          <HeroMetricCard
            index={2}
            icon={<MapPin size={13} />}
            label="Critical Hazard Zones"
            value={<span className="numeric text-3xl font-bold text-fg">03</span>}
            meta={<span className="text-[11px] text-fg-dim">NH-27 &amp; Teesta corridor</span>}
            graph={<ZonesGraph />}
          />
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <div className="relative z-10 mx-auto mt-10 flex w-full max-w-7xl items-center justify-between px-6 text-fg-dim">
        <span className="caption-mono text-[10px]">
          GEOSPATIAL INTELLIGENCE · NORTH-EAST REGION
        </span>
        <a
          href="#terrain"
          className="flex items-center gap-1 text-[10px] font-medium tracking-wide transition-colors hover:text-fg"
        >
          <span>SCROLL DOWN</span>
          <ChevronDown size={12} />
        </a>
      </div>
    </section>
  );
}
