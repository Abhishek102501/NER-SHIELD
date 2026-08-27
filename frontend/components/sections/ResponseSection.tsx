"use client";

import { FieldOfficerCard } from "@/components/response/FieldOfficerCard";
import { ResponsePipeline } from "@/components/response/ResponsePipeline";
import { ResponsePriority } from "@/components/response/ResponsePriority";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";

export function ResponseSection() {
  return (
    <Section id="response" className="bg-canvas-soft border-b border-hairline py-20">
      {/* Header following DESIGN.md spec */}
      <div className="max-w-3xl mb-12">
        <span className="caption-mono text-mute block mb-2">EMERGENCY RESPONSE DISPATCH.</span>
        <h2 className="display-lg text-ink">
          From AI signal to saved lives, in one loop.
        </h2>
        <p className="body-lg text-body mt-4">
          NER-SHIELD ranks every hazard by population exposure, recommends NDRF/SDRF intervention routes, and keeps ground truth flowing offline.
        </p>
      </div>

      <div className="space-y-6">
        <Reveal>
          <ResponsePipeline />
        </Reveal>

        <Reveal delay={0.05}>
          <ResponsePriority />
        </Reveal>

        <div className="pt-6">
          <Reveal>
            <div className="mb-5">
              <span className="caption-mono text-link block mb-1">FIELD OFFICER · OFFLINE FIRST</span>
              <h3 className="display-sm text-ink max-w-xl">
                Ground truth keeps flowing, even when cellular networks fail.
              </h3>
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <FieldOfficerCard />
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
