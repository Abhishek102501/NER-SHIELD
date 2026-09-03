"use client";

import { Siren } from "lucide-react";
import { triggerDemoAlert } from "@/components/alerts/AlertSystem";
import { FieldOfficerCard } from "@/components/response/FieldOfficerCard";
import { ResponsePipeline } from "@/components/response/ResponsePipeline";
import { ResponsePriority } from "@/components/response/ResponsePriority";
import { Reveal } from "@/components/ui/Reveal";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function ResponseSection() {
  return (
    <Section id="response" className="border-t border-white/5">
      <div className="flex flex-wrap items-end justify-between gap-4">
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
        <button
          onClick={triggerDemoAlert}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-sev-critical/40 bg-sev-critical/10 px-4 py-2.5 text-[12px] font-semibold text-sev-critical transition-colors hover:bg-sev-critical/20"
        >
          <Siren size={14} /> Trigger demo alert
        </button>
      </div>

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
