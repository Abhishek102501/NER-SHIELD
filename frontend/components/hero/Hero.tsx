"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Radar } from "lucide-react";
import { usePointerParallax } from "@/hooks/usePointerParallax";
import { EASE_OUT } from "@/lib/motion";

const HeroCanvas = dynamic(() => import("./HeroCanvas"), { ssr: false });

const TITLE_LINES = [
  ["Terrain", "intelligence", "that", "sees"],
  ["disaster", "before", "it", "strikes."],
];

const STATS = [
  { label: "Peak risk index", value: "87%" },
  { label: "Active alerts", value: "14" },
  { label: "Critical zones", value: "03" },
];

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const { x: px, y: py } = usePointerParallax();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const overlayY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const parallaxX = useTransform(px, [-0.5, 0.5], [-14, 14]);
  const parallaxY = useTransform(py, [-0.5, 0.5], [-8, 8]);

  useEffect(() => setMounted(true), []);

  return (
    <section
      ref={ref}
      className="relative h-[100svh] min-h-[640px] w-full overflow-hidden"
    >
      {/* 3D layer (or reduced-motion poster) */}
      <div className="absolute inset-0">
        {mounted && !reduce ? (
          <HeroCanvas scroll={scrollYProgress} />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(120%_90%_at_50%_120%,rgba(34,211,238,0.16),transparent_55%),radial-gradient(80%_60%_at_50%_-10%,rgba(56,189,248,0.08),transparent_60%)]" />
        )}
      </div>

      {/* Legibility + blend gradients */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,14,0.55)_0%,transparent_28%,transparent_55%,rgba(5,7,14,0.85)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink" />

      {/* Overlay content */}
      <motion.div
        style={{ y: overlayY, opacity: overlayOpacity }}
        className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-center px-6"
      >
        <motion.div style={{ x: parallaxX, y: parallaxY }}>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 backdrop-blur-sm"
          >
            <Radar size={13} className="text-accent" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-fg-muted">
              NER-SHIELD · AI Disaster Intelligence
            </span>
          </motion.div>

          <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-fg sm:text-5xl md:text-6xl">
            {TITLE_LINES.map((line, li) => (
              <span key={li} className="block overflow-hidden">
                <span className="flex flex-wrap gap-x-[0.28em]">
                  {line.map((word, wi) => (
                    <motion.span
                      key={wi}
                      className="inline-block"
                      initial={{ y: "110%", opacity: 0 }}
                      animate={{ y: "0%", opacity: 1 }}
                      transition={{
                        duration: 0.85,
                        ease: EASE_OUT,
                        delay: 0.15 + (li * 4 + wi) * 0.06,
                      }}
                    >
                      {word === "sees" || word === "strikes." ? (
                        <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">
                          {word}
                        </span>
                      ) : (
                        word
                      )}
                    </motion.span>
                  ))}
                </span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.55 }}
            className="mt-6 max-w-xl text-pretty text-[15px] leading-relaxed text-fg-muted"
          >
            A live risk brain for the North Eastern Region — fusing rainfall,
            soil, slope and satellite signals to detect, understand, simulate,
            and prioritise the response before people are put at risk.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.68 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link
              href="/command"
              className="group inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-[13px] font-semibold text-black transition-transform hover:-translate-y-0.5"
            >
              Open Command Center
              <ArrowRight
                size={15}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
            <a
              href="#terrain"
              className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.02] px-5 py-3 text-[13px] font-semibold text-fg-muted backdrop-blur-sm transition-colors hover:border-white/25 hover:text-fg"
            >
              Explore the system
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="mt-10 flex flex-wrap gap-6"
          >
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col">
                <span className="numeric text-2xl font-semibold text-fg">
                  {s.value}
                </span>
                <span className="text-[10px] uppercase tracking-[0.16em] text-fg-dim">
                  {s.label}
                </span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      <motion.a
        href="#terrain"
        aria-label="Scroll to explore"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-fg-dim"
      >
        <motion.span
          animate={reduce ? undefined : { y: [0, 7, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-1"
        >
          <span className="text-[9px] uppercase tracking-[0.2em]">Scroll</span>
          <ChevronDown size={16} />
        </motion.span>
      </motion.a>
    </section>
  );
}
