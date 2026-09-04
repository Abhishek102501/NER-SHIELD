"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Menu, Shield, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#top", label: "Home" },
  { href: "#terrain", label: "Terrain" },
  { href: "#prediction", label: "Risk Intelligence" },
  { href: "#command", label: "GIS Map" },
  { href: "#response", label: "Response" },
  { href: "#about", label: "About" },
];

const SECTION_IDS = LINKS.map((l) => l.href.slice(1));

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState("top");
  const activeRef = useRef("top");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-spy: highlight whichever tracked section currently owns the most
  // of the viewport's upper band. Near the very top of the page, "Home"
  // wins outright regardless of section intersection.
  useEffect(() => {
    const trackedIds = SECTION_IDS.filter((id) => id !== "top");
    const targets = trackedIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);

    if (!targets.length) return;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        let bestId = "top";
        let bestRatio = 0;
        for (const [id, ratio] of visible) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }
        if (window.scrollY < 80) bestId = "top";
        if (bestId !== activeRef.current) {
          activeRef.current = bestId;
          setActive(bestId);
        }
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    for (const el of targets) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Close the mobile menu on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <div
        className={cn(
          "mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl px-4 transition-all duration-300 sm:px-5",
          scrolled || menuOpen
            ? "glass-float border border-white/10 shadow-[0_16px_50px_-16px_rgba(0,0,0,0.7)]"
            : "border border-white/5 bg-white/[0.015] backdrop-blur-sm",
        )}
      >
        <Link
          href="/"
          className="flex items-center gap-2.5"
          onClick={() => setMenuOpen(false)}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-accent/30 bg-accent/10 text-accent shadow-[0_0_18px_-4px_rgba(34,211,238,0.5)]">
            <Shield size={17} strokeWidth={2.2} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[14px] font-bold tracking-tight text-fg">
              NER<span className="text-accent">-</span>SHIELD
            </span>
            <span className="numeric mt-0.5 text-[8.5px] font-medium tracking-[0.16em] text-fg-dim">
              AI DISASTER INTELLIGENCE
            </span>
          </span>
        </Link>

        {/* Desktop links — glass pill */}
        <div className="hidden items-center gap-0.5 rounded-full border border-white/8 bg-white/[0.03] p-1 lg:flex">
          {LINKS.map((l) => {
            const id = l.href.slice(1);
            const isActive = active === id;
            return (
              <a
                key={l.href}
                href={l.href}
                className={cn(
                  "relative rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors",
                  isActive ? "text-fg" : "text-fg-muted hover:text-fg",
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-active-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="absolute inset-0 rounded-full border border-accent/30 bg-accent/10"
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  {l.label}
                  {isActive && (
                    <span className="h-1 w-1 rounded-full bg-accent shadow-[0_0_6px_1px_rgba(34,211,238,0.8)]" />
                  )}
                </span>
              </a>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {/* System status */}
          <div className="hidden items-center gap-2 border-r border-white/8 pr-3 lg:flex">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sev-low/60" />
              <span className="relative h-2 w-2 rounded-full bg-sev-low" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[11px] font-semibold text-fg">
                System Operational
              </span>
              <span className="numeric text-[9px] text-fg-dim">
                Live · North-East India
              </span>
            </span>
          </div>

          <Link
            href="/command"
            className="group hidden items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-[12px] font-semibold text-black shadow-[0_0_0_1px_rgba(34,211,238,0.3),0_10px_28px_-10px_rgba(34,211,238,0.55)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(34,211,238,0.45),0_14px_32px_-8px_rgba(34,211,238,0.7)] sm:inline-flex"
          >
            Command Center
            <ArrowRight
              size={13}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/12 text-fg transition-colors hover:bg-white/5 lg:hidden"
          >
            {menuOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="glass-float mx-auto mt-2 max-w-6xl overflow-hidden rounded-2xl border border-white/10 lg:hidden"
          >
            <div className="flex flex-col gap-1 p-3">
              {LINKS.map((l) => {
                const isActive = active === l.href.slice(1);
                return (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors",
                      isActive
                        ? "bg-accent/10 text-accent"
                        : "text-fg-muted hover:bg-white/5 hover:text-fg",
                    )}
                  >
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                    {l.label}
                  </a>
                );
              })}
              <Link
                href="/command"
                onClick={() => setMenuOpen(false)}
                className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-3 text-[13px] font-semibold text-black"
              >
                Open Command Center
                <ArrowRight size={14} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
