import Link from "next/link";
import { ArrowUpRight, Shield } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/8 px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-8 sm:p-12">
            <p className="max-w-2xl text-balance text-2xl font-semibold leading-tight tracking-tight text-fg sm:text-3xl">
              We detect the danger, understand it, simulate the impact, and
              prioritise the response —{" "}
              <span className="text-accent">to protect people.</span>
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/command"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-[13px] font-semibold text-black transition-transform hover:-translate-y-0.5"
              >
                Open Command Center
                <ArrowUpRight size={15} />
              </Link>
              <a
                href="#terrain"
                className="inline-flex items-center gap-2 rounded-lg border border-white/12 px-5 py-3 text-[13px] font-semibold text-fg-muted transition-colors hover:border-white/25 hover:text-fg"
              >
                Back to top
              </a>
            </div>
          </div>
        </Reveal>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg border border-accent/30 bg-accent/10 text-accent">
              <Shield size={14} strokeWidth={2.2} />
            </span>
            <span className="text-[13px] font-bold tracking-tight text-fg">
              NER<span className="text-accent">-</span>SHIELD
            </span>
          </div>
          <p className="text-[11px] text-fg-dim">
            AI-Powered Disaster Intelligence · North Eastern Region ·
            Demonstration build for SIH 2026
          </p>
        </div>
      </div>
    </footer>
  );
}
