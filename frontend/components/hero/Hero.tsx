"use client";

import { useReducedMotion } from "framer-motion";
import Link from "next/link";
import { Satellite } from "lucide-react";

export function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="top"
      className="relative flex h-[100vh] w-full flex-col overflow-hidden border-b border-white/5 bg-ink pt-28 sm:pt-32"
    >
      {/* Hero background — looping NE-India risk-map video. Fills the section,
          preserves aspect ratio (cropped via object-cover, never stretched),
          never tiles. Falls back to the static poster frame for visitors who
          prefer reduced motion, instead of autoplaying. */}
      {reduceMotion ? (
        <div
          className="absolute inset-0 z-0 h-screen w-full bg-cover bg-no-repeat"
          style={{ backgroundImage: "url('/hero-background.png')", backgroundPosition: "70% center" }}
          aria-hidden="true"
        />
      ) : (
        <video
          className="absolute inset-0 z-0 h-screen w-full object-cover"
          style={{ objectPosition: "70% center" }}
          src="/hero-background.mp4"
          poster="/hero-background.png"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
        />
      )}

      {/* Legibility gradient: darker toward the text column and edges */}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-ink via-ink/68 to-ink/25" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-ink/55 via-ink/15 to-ink" />

      {/* Satellite decoration */}
      <div className="pointer-events-none absolute right-[6%] top-[9%] z-2 hidden flex-col items-end gap-1 lg:flex">
        <Satellite size={26} strokeWidth={1.2} className="rotate-18 text-fg-dim" />
        <span className="caption-mono text-right text-[9px] leading-tight text-fg-dim">
          REAL-TIME SATELLITE DATA
          <br />
          24/7 MONITORING
        </span>
      </div>

      {/* Hero Content — centered headline block fills the available vertical space */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1
          className="whitespace-nowrap font-serif font-normal uppercase text-white"
          style={{
            fontSize: "clamp(8px, 3.9vw, 4.75rem)",
            letterSpacing: "0.12em",
            lineHeight: 1.15,
          }}
        >
          Predict disasters.
          <br />
          Before they become disasters.
        </h1>

        <span
          className="mt-10 whitespace-nowrap uppercase text-white/60 sm:mt-12"
          style={{
            fontSize: "clamp(8px, calc(4vw - 3px), 12px)",
            letterSpacing: "clamp(0px, calc(2.2vw - 8.5px), 4.2px)",
          }}
        >
          AI landslide intelligence for North-East India
        </span>

        <Link
          href="/command"
          className="mt-9 border uppercase text-[#F2EFE6]"
          style={{
            borderColor: "#F2EFE6",
            borderWidth: 1,
            borderRadius: 2,
            fontSize: 10,
            letterSpacing: "0.2em",
            padding: "14px 32px",
            background: "transparent",
          }}
        >
          Command Center
        </Link>
      </div>
    </section>
  );
}
