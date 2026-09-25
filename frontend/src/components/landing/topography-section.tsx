"use client";

import dynamic from "next/dynamic";
import { SectionHeader } from "./section-header";
import { Reveal } from "./reveal";

const LiquidityTerrainStage = dynamic(
  () => import("@/components/three/liquidity-terrain-stage").then((m) => m.LiquidityTerrainStage),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center rounded-xl border border-hairline bg-white sm:h-[480px] lg:h-[540px]">
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          Loading liquidity terrain
        </div>
      </div>
    ),
  },
);

export function TopographySection() {
  return (
    <section aria-labelledby="topography-heading" className="border-t border-hairline bg-panel/50 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          index="02"
          eyebrow="Liquidity Topography"
          title={
            <>
              The Book Is a
              <br />
              Dynamic Landscape
            </>
          }
          lede="Think of the order book as terrain. Price levels form one axis, event time the other, and resting depth becomes elevation. Peaks are liquidity concentrations; thin regions are valleys where orders have been cancelled or consumed."
        />

        <Reveal delay={0.08} className="mt-10">
          <LiquidityTerrainStage />
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-faint">
            Liquidity is not static. Orders arrive, disappear, and interact continuously across
            price levels.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
