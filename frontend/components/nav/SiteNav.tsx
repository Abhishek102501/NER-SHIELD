"use client";

import Link from "next/link";
import { ArrowRight, Menu, Moon, Sparkles, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#terrain", label: "Terrain Twin" },
  { href: "#prediction", label: "Risk Matrix" },
  { href: "#command", label: "GIS Command" },
  { href: "#response", label: "Response Loop" },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // Check system preference or saved theme
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setDark(true);
      document.documentElement.classList.add("dark");
    } else {
      setDark(false);
      document.documentElement.classList.remove("dark");
    }

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleTheme = () => {
    if (dark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setDark(true);
    }
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 h-16 transition-all duration-200 liquid-glass",
        scrolled && "shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
      )}
    >
      {/* Top liquid glass shimmer line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan/40 via-pink-500/40 to-transparent opacity-80" />

      <nav className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand logo according to DESIGN.md */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="grid h-7 w-7 place-items-center rounded bg-primary text-on-primary font-bold text-xs transition-transform group-hover:scale-105 shadow-sm">
            ▲
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            NER<span className="text-body font-normal">-SHIELD</span>
          </span>
        </Link>

        {/* Center link row: nav-link ghost pills */}
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-1.5 body-sm text-body transition-all hover:bg-canvas-soft-2 hover:text-ink hover:scale-[1.02]"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Light and Dark mode"
            className="grid h-8 w-8 place-items-center rounded-full border border-hairline bg-canvas text-body hover:text-ink hover:bg-canvas-soft-2 transition-all hover:scale-105 cursor-pointer shadow-sm"
          >
            {dark ? <Sun size={15} className="text-warning" /> : <Moon size={15} className="text-link" />}
          </button>

          <a
            href="#prediction"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border border-hairline bg-canvas/80 text-ink hover:border-hairline-strong transition-all cursor-pointer shadow-sm"
          >
            <Sparkles size={12} className="text-cyan animate-pulse" />
            <span>Ask AI</span>
          </a>

          <Link
            href="/command"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary text-on-primary px-3.5 sm:px-4 py-1.5 text-xs font-semibold shadow-sm transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Command Center</span>
            <ArrowRight size={13} />
          </Link>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle Navigation Menu"
            className="grid h-8 w-8 place-items-center rounded-full border border-hairline bg-canvas text-body hover:text-ink md:hidden cursor-pointer"
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Dropdown */}
      {mobileOpen && (
        <div className="md:hidden liquid-glass border-b border-hairline px-6 py-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="body-sm font-medium text-body hover:text-ink py-1 border-b border-hairline/40"
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}



