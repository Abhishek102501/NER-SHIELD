import { AlertSystem } from "@/components/alerts/AlertSystem";
import { Hero } from "@/components/hero/Hero";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteNav } from "@/components/nav/SiteNav";
import { RiskExplorer } from "@/components/risk/RiskExplorer";
import { GisCommandSection } from "@/components/sections/GisCommandSection";
import { GlobalThreatIntelSection } from "@/components/sections/GlobalThreatIntelSection";
import { ResponseSection } from "@/components/sections/ResponseSection";
import { TerrainIntelligence } from "@/components/sections/TerrainIntelligence";

export default function Home() {
  return (
    <>
      <SiteNav />
      <AlertSystem />
      <main className="relative">
        <Hero />
        <TerrainIntelligence />
        <RiskExplorer />
        <GisCommandSection />
        <GlobalThreatIntelSection />
        <ResponseSection />
      </main>
      <SiteFooter />
    </>
  );
}
