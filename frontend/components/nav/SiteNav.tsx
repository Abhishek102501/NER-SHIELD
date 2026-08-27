"use client";

import Link from "next/link";
import { ArrowRight, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#terrain", label: "Terrain" },
  { href: "#prediction", label: "Prediction" },
  { href: "#command", label: "GIS" },
  { href: "#response", label: "Response" },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled
          ? "glass border-b border-white/8"
          : "border-b border-transparent",
      )}
    >
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-accent/30 bg-accent/10 text-accent">
            <Shield size={16} strokeWidth={2.2} />
          </span>
          <span className="text-[14px] font-bold tracking-tight text-fg">
            NER<span className="text-accent">-</span>SHIELD
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-fg-muted transition-colors hover:bg-white/5 hover:text-fg"
            >
              {l.label}
            </a>
          ))}
        </div>

        <Link
          href="/command"
          className="group inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[12px] font-semibold text-black transition-transform hover:-translate-y-0.5"
        >
          <span className="hidden sm:inline">Command Center</span>
          <span className="sm:hidden">Command</span>
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </nav>
    </header>
  );
}
