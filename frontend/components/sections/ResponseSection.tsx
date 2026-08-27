"use client";

import { FieldOfficerCard } from "@/components/response/FieldOfficerCard";
import { ResponsePipeline } from "@/components/response/ResponsePipeline";
import { ResponsePriority } from "@/components/response/ResponsePriority";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function ResponseSection() {
  return (
    <Section id="response" className="border-t border-white/5">
      <SectionHeader
        eyebrow="Emergency Response"
        title={
          <>
            From signal to{" "}
            <span className="text-accent">saved lives</span>, in one loop.
          </>
        }
        subtitle="NER-SHIELD ranks every hazard by who is exposed, recommends the action, and moves it through a clear operating loop — so responders act on the right thing first."
      />

      <div className="mt-10 space-y-4">
        <Reveal>
          <ResponsePipeline />
        </Reveal>

        <Reveal delay={0.05}>
          <ResponsePriority />
        </Reveal>

        <div className="pt-4">
          <Reveal>
            <div className="mb-5">
              <p className="eyebrow mb-2 text-accent/70">Field Officer · Offline-first</p>
              <h3 className="max-w-xl text-lg font-semibold text-fg">
                Ground truth keeps flowing, even when the network doesn&apos;t.
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
