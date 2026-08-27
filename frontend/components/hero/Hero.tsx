"use client";

import { motion, useReducedMotion, useScroll } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Layers, ChevronDown } from "lucide-react";
import { EASE_OUT } from "@/lib/motion";

const HeroCanvas = dynamic(() => import("./HeroCanvas"), { ssr: false });

const STATS = [
  { label: "Peak risk index", value: "87.4%", desc: "Critical landslide risk" },
  { label: "Active alerts", value: "14", desc: "Assam & Meghalaya sectors" },
  { label: "Critical hazard zones", value: "03", desc: "NH-27 & Teesta corridor" },
];

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
      ref={sectionRef}
      className="relative min-h-[92vh] w-full overflow-hidden bg-canvas-soft pt-24 pb-16 flex flex-col justify-between border-b border-hairline"
    >
      {/* 3D WebGL Digital Twin Terrain Canvas Background */}
      <div className="absolute inset-0 z-0">
        {mounted && !reduce ? (
          <HeroCanvas scroll={scrollYProgress} />
        ) : (
          <div className="pointer-events-none absolute inset-0 mesh-gradient opacity-60" />
        )}
      </div>

      {/* Subtle legibility gradient overlay over 3D canvas */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-canvas-soft/70 via-canvas-soft/30 to-canvas-soft/90" />

      {/* Hero Content Container */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pt-12">
        <div className="max-w-3xl">
          {/* Eyebrow in caption-mono */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-hairline bg-canvas px-3 py-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          >
            <span className="h-2 w-2 rounded-full bg-cyan animate-pulse" />
            <span className="caption-mono text-body">
              SIH 2026 · AI DISASTER INTELLIGENCE PLATFORM.
            </span>
          </motion.div>

          {/* Headline in display-xl */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 }}
            className="display-xl text-ink max-w-2xl text-balance"
          >
            Terrain intelligence that sees disaster before it strikes.
          </motion.h1>

          {/* Lead Paragraph in body-lg */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.2 }}
            className="mt-6 body-lg text-body max-w-xl text-pretty font-medium"
          >
            A multi-dimensional AI digital twin fusing real-time rainfall radar,
            slope stability, soil saturation, and satellite signals to detect and simulate
            disasters across North-East India.
          </motion.p>

          {/* Dual CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <Link
              href="/command"
              className="button-primary inline-flex items-center gap-2 group"
            >
              <span>Open Command Center</span>
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>

            <a
              href="#terrain"
              className="button-secondary inline-flex items-center gap-2"
            >
              <Layers size={16} className="text-body" />
              <span>Explore Digital Twin</span>
            </a>
          </motion.div>
        </div>

        {/* 3-Up Marketing Metric Cards */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.4 }}
          className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-4xl"
        >
          {STATS.map((s) => (
            <div
              key={s.label}
              className="card-marketing p-5 flex flex-col justify-between hover:border-hairline-strong transition-colors bg-canvas/90 backdrop-blur-sm"
            >
              <div>
                <span className="caption-mono text-mute block mb-2">{s.label}</span>
                <span className="numeric text-3xl font-semibold text-ink tracking-tight">
                  {s.value}
                </span>
              </div>
              <p className="mt-3 body-sm text-body">{s.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 pt-10 flex items-center justify-between text-mute">
        <span className="caption-mono text-[10px]">GEOSPATIAL INTELLIGENCE · NORTH-EAST REGION</span>
        <a href="#terrain" className="flex items-center gap-1 caption-mono text-[10px] hover:text-ink transition-colors">
          <span>SCROLL DOWN</span>
          <ChevronDown size={12} />
        </a>
      </div>
    </section>
  );
}

