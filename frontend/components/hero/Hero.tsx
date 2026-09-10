"use client";

import { useReducedMotion } from "framer-motion";
import Link from "next/link";
import { Satellite } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// The rotating hero video library. Clips play in this order, indefinitely.
// Each one reads from NEXT_PUBLIC_HERO_VIDEO_n first — set those to CDN/blob
// URLs in production so the ~99MB of source video ships from an edge/CDN
// origin instead of bloating the app's own deploy bundle. Falls back to the
// copies in `public/` for local dev when no env var is set (see
// .env.example).
const HERO_VIDEO_LIBRARY = [
  process.env.NEXT_PUBLIC_HERO_VIDEO_1 || "/hero-background.mp4",
  process.env.NEXT_PUBLIC_HERO_VIDEO_2 || "/hero-terrain-ridge.mp4",
  process.env.NEXT_PUBLIC_HERO_VIDEO_3 || "/hero-hillside-settlement.mp4",
];

// How long the two video layers overlap while crossfading from one clip into
// the next. Long enough to dissolve the cut, short enough that the two
// frames never look obviously superimposed on screen.
const LOOP_CROSSFADE_S = 1.2;

/**
 * Cycles through a library of clips on two stacked <video> elements,
 * crossfading from the active clip into the next one (already preloaded on
 * the idle layer) just before the active clip ends. The result reads as one
 * continuous, seamlessly looping reel instead of a hard cut between clips.
 */
function useVideoLibraryLoop(
  videoARef: React.RefObject<HTMLVideoElement | null>,
  videoBRef: React.RefObject<HTMLVideoElement | null>,
  sources: string[],
  enabled: boolean,
) {
  const [activeVideo, setActiveVideo] = useState<"a" | "b">("a");

  useEffect(() => {
    if (!enabled || sources.length === 0) return;
    const a = videoARef.current;
    const b = videoBRef.current;
    if (!a || !b) return;

    let current = a;
    let next = b;
    let playingIndex = 0;
    let switching = false;
    let timeoutId: number | undefined;

    a.src = sources[0];
    b.src = sources[1 % sources.length];
    a.load();
    b.load();

    const onTimeUpdate = () => {
      if (switching || !current.duration) return;
      if (current.currentTime >= current.duration - LOOP_CROSSFADE_S) {
        switching = true;
        next.play().catch(() => {});
        setActiveVideo(current === a ? "b" : "a");

        timeoutId = window.setTimeout(() => {
          current.pause();
          playingIndex = (playingIndex + 1) % sources.length;
          const upcomingIndex = (playingIndex + 1) % sources.length;
          current.src = sources[upcomingIndex];
          current.currentTime = 0;
          current.load();
          [current, next] = [next, current];
          switching = false;
        }, LOOP_CROSSFADE_S * 1000);
      }
    };

    a.addEventListener("timeupdate", onTimeUpdate);
    b.addEventListener("timeupdate", onTimeUpdate);
    a.play().catch(() => {});

    return () => {
      a.removeEventListener("timeupdate", onTimeUpdate);
      b.removeEventListener("timeupdate", onTimeUpdate);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [enabled, videoARef, videoBRef, sources]);

  return activeVideo;
}

export function Hero() {
  const reduceMotion = useReducedMotion();
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const activeVideo = useVideoLibraryLoop(videoARef, videoBRef, HERO_VIDEO_LIBRARY, !reduceMotion);

  return (
    <section
      id="top"
      className="relative flex h-[100vh] w-full flex-col overflow-hidden border-b border-white/5 bg-ink pt-28 sm:pt-32"
    >
      {/* Hero background — a rotating library of clips. Two stacked <video>
          layers crossfade from one clip into the next (preloaded on the idle
          layer) just before the active one ends, so it plays as one
          continuous, seamlessly looping reel. Falls back to the static
          poster frame for visitors who prefer reduced motion. */}
      {reduceMotion ? (
        <div
          className="absolute inset-0 z-0 h-screen w-full bg-cover bg-no-repeat"
          style={{ backgroundImage: "url('/hero-background.png')", backgroundPosition: "70% center" }}
          aria-hidden="true"
        />
      ) : (
        <>
          <video
            ref={videoARef}
            className="hero-reel-video absolute inset-0 z-0 h-screen w-full object-cover"
            style={{
              objectPosition: "70% center",
              opacity: activeVideo === "a" ? 1 : 0,
              transitionDuration: `${LOOP_CROSSFADE_S * 1000}ms`,
              animationPlayState: activeVideo === "a" ? "running" : "paused",
            }}
            poster="/hero-background.png"
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
          />
          <video
            ref={videoBRef}
            className="hero-reel-video absolute inset-0 z-0 h-screen w-full object-cover"
            style={{
              objectPosition: "70% center",
              opacity: activeVideo === "b" ? 1 : 0,
              transitionDuration: `${LOOP_CROSSFADE_S * 1000}ms`,
              animationPlayState: activeVideo === "b" ? "running" : "paused",
            }}
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
          />
        </>
      )}

      {/* Legibility gradient: much lighter now — the video should read clearly, not sit under a dark wash */}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-ink/45 via-ink/25 to-ink/10" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-ink/30 via-transparent to-ink/55" />

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
