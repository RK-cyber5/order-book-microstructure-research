"use client";

import { Navbar } from "./navbar";
import { Hero } from "./hero";
import { MetricsStrip } from "./metrics-strip";
import { ResearchPipeline } from "./research-pipeline";
import { TopographySection } from "./topography-section";
import { SignalStructure } from "./signal-structure";
import { SignalSpaceSection } from "./signal-space-section";
import { Generalization } from "./generalization";
import { RigorSection } from "./rigor-section";
import { ExecutionSection } from "./execution-section";
import { Philosophy } from "./philosophy";
import { Cta } from "./cta";
import { Footer } from "./footer";

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-ink antialiased">
      <Navbar />
      <main id="main" className="flex-1">
        <Hero />
        <MetricsStrip />
        <ResearchPipeline />
        <TopographySection />
        <SignalStructure />
        <SignalSpaceSection />
        <Generalization />
        <RigorSection />
        <ExecutionSection />
        <Philosophy />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
