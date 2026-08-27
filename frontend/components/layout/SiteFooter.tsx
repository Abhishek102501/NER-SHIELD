import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline bg-canvas-soft px-6 py-16 text-body">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="card-marketing p-8 sm:p-12 relative overflow-hidden bg-canvas">
            <div className="relative z-10">
              <span className="caption-mono text-mute mb-3 block">
                MISSION STATEMENT · SIH 2026
              </span>
              <p className="max-w-2xl text-balance display-md text-ink">
                Detecting hazard, simulating terrain impact, and prioritising response —{" "}
                <span className="text-body font-normal">to safeguard North-East India.</span>
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/command"
                  className="button-primary inline-flex items-center gap-2"
                >
                  <span>Open GIS Command Center</span>
                  <ArrowRight size={16} />
                </Link>
                <a
                  href="#terrain"
                  className="button-secondary inline-flex items-center gap-2"
                >
                  <span>Back to Top</span>
                </a>
              </div>
            </div>
          </div>
        </Reveal>

        {/* 4-Column Vercel Footer Section */}
        <div className="mt-14 grid grid-cols-2 gap-8 border-t border-hairline pt-10 sm:grid-cols-4">
          <div>
            <span className="caption-mono text-ink block mb-3 font-medium">
              SYSTEM MODULES
            </span>
            <ul className="space-y-2 body-sm text-body">
              <li><a href="#terrain" className="hover:text-ink transition-colors">3D Digital Twin</a></li>
              <li><a href="#prediction" className="hover:text-ink transition-colors">Risk Matrix Explorer</a></li>
              <li><a href="#command" className="hover:text-ink transition-colors">GIS Command Center</a></li>
              <li><a href="#response" className="hover:text-ink transition-colors">Disaster Response Loop</a></li>
            </ul>
          </div>

          <div>
            <span className="caption-mono text-ink block mb-3 font-medium">
              SECTORS MONITORED
            </span>
            <ul className="space-y-2 body-sm text-body">
              <li><span className="text-body">Assam Valley (Guwahati - Silchar)</span></li>
              <li><span className="text-body">Meghalaya Escarpment (Cherrapunji)</span></li>
              <li><span className="text-body">Sikkim Teesta Corridor (Gangtok)</span></li>
              <li><span className="text-body">NH-27 Landslide Prone Arteries</span></li>
            </ul>
          </div>

          <div>
            <span className="caption-mono text-ink block mb-3 font-medium">
              TECH STACK
            </span>
            <ul className="space-y-2 body-sm text-body">
              <li><span className="text-body">Geospatial AI & Satellite Radar</span></li>
              <li><span className="text-body">Next.js & React 19 Engine</span></li>
              <li><span className="text-body">Three.js Digital Twin Canvas</span></li>
              <li><span className="text-body">Vercel Design Language</span></li>
            </ul>
          </div>

          <div>
            <span className="caption-mono text-ink block mb-3 font-medium">
              NER-SHIELD
            </span>
            <p className="body-sm text-body leading-relaxed mb-3">
              AI-powered disaster intelligence platform for North-Eastern Region.
            </p>
            <span className="caption-mono text-[10px] text-mute block">
              SIH 2026 · HACKATHON DEMO
            </span>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-hairline pt-6 sm:flex-row text-mute body-sm">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded bg-ink text-on-primary font-bold text-xs">
              ▲
            </span>
            <span className="body-sm text-ink font-semibold">
              NER-SHIELD
            </span>
          </div>
          <p className="caption-mono text-[11px]">
            © 2026 NER-SHIELD · Smart India Hackathon. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

