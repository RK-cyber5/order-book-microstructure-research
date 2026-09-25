"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ChevronRight,
  Database,
  Layers,
  Scale,
  ShieldCheck,
  Sigma,
  type LucideIcon,
} from "lucide-react";
import { SectionHeader } from "./section-header";
import { Reveal } from "./reveal";
import { useMethodology } from "@/hooks/use-research-data";
import { FEATURE_COLORS } from "./site-constants";
import { cn } from "@/lib/utils";

const STAGE_META: { title: string; icon: LucideIcon }[] = [
  { title: "Raw L2 Events", icon: Database },
  { title: "Book Reconstruction", icon: Layers },
  { title: "Microstructure Features", icon: Sigma },
  { title: "Short-Horizon Signals", icon: Activity },
  { title: "Out-of-Sample Testing", icon: ShieldCheck },
  { title: "Execution Costs", icon: Scale },
];

const FEATURE_ORDER = ["l1_imb", "l5_imb_1k", "microprice_dev", "ofi"] as const;

export function ResearchPipeline() {
  const reduce = useReducedMotion();
  const { data: methodology, isError, isLoading } = useMethodology();

  const stages = useMemo(
    () =>
      STAGE_META.map((meta, i) => ({
        ...meta,
        index: String(i + 1).padStart(2, "0"),
        description: methodology?.pipeline?.[i]?.description ?? null,
      })),
    [methodology],
  );

  const features = methodology?.features ?? [];
  const horizons = methodology?.horizons_events ?? [];

  return (
    <section id="overview" aria-labelledby="overview-heading" className="bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          index="01"
          eyebrow="Research Pipeline"
          title={
            <>
              From Order Book
              <br />
              to Execution
            </>
          }
          lede="Each stage narrows raw exchange events into statistical evidence — and finally into an execution verdict. The pipeline is strictly chronological: parameters are frozen before any unseen data is touched."
        />

        {/* Pipeline nodes with flowing data particles */}
        <Reveal delay={0.1} className="relative mt-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-2 top-[58px] z-0 hidden h-px lg:block"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-hairline to-transparent" />
            {!reduce &&
              [0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="absolute top-1/2 h-[7px] w-[7px] -translate-y-1/2 rounded-full bg-accent shadow-[0_0_8px_rgba(29,91,230,0.6)]"
                  animate={{ left: ["-0.5%", "100.5%"], opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 7, delay: i * 2.3, repeat: Infinity, ease: "linear" }}
                />
              ))}
          </div>

          <ol className="relative z-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {stages.map((stage, i) => {
              const Icon = stage.icon;
              return (
                <li key={stage.title} className="relative">
                  {i > 0 ? (
                    <ChevronRight
                      aria-hidden="true"
                      className="absolute -left-[13px] top-[52px] hidden h-4 w-4 text-faint/50 lg:block"
                    />
                  ) : null}
                  <div className="group h-full rounded-lg border border-hairline bg-white p-4 transition-all duration-300 hover:-translate-y-[2px] hover:border-accent/45 hover:shadow-[0_12px_28px_-18px_rgba(10,27,51,0.25)]">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-medium tracking-[0.18em] text-faint/70">
                        {stage.index}
                      </span>
                      <span
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-md border transition-colors",
                          "border-hairline bg-panel text-ink group-hover:border-accent/35 group-hover:bg-accent-soft/40 group-hover:text-accent-deep",
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </div>
                    <h3 className="mt-3 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">
                      {stage.title}
                    </h3>
                    <p
                      className={cn(
                        "mt-2 text-[11.5px] leading-relaxed transition-colors",
                        "text-faint group-hover:text-body",
                        !stage.description && isLoading && "animate-pulse",
                      )}
                    >
                      {stage.description ??
                        (isError
                          ? "Stage detail unavailable — research API did not respond."
                          : "Loading stage detail from research outputs…")}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Reveal>

        {/* Features + horizons */}
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <Reveal delay={0.05}>
            <div className="h-full rounded-lg border border-hairline bg-panel/60 p-5 sm:p-6">
              <h3 className="font-mono text-[10.5px] font-medium uppercase tracking-[0.24em] text-faint">
                Features studied
              </h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {FEATURE_ORDER.map((key) => {
                  const feature = features.find((f) => f.key === key);
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-2 rounded-full border border-hairline bg-white px-3.5 py-1.5 font-mono text-[11px] font-medium text-ink"
                    >
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: FEATURE_COLORS[key] }}
                      />
                      {feature?.label ?? key}
                    </span>
                  );
                })}
                <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-hairline bg-white px-3.5 py-1.5 font-mono text-[11px] text-faint">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full border border-faint" />
                  Relative Spread · control
                </span>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-faint">
                Top-of-book and depth-weighted imbalance, microprice deviation from the mid, and
                event-based order-flow imbalance.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="flex h-full flex-col rounded-lg border border-hairline bg-panel/60 p-5 sm:p-6">
              <h3 className="font-mono text-[10.5px] font-medium uppercase tracking-[0.24em] text-faint">
                Prediction horizons · event time
              </h3>
              <p className="mt-5 font-mono text-sm font-medium tabular-nums leading-relaxed text-ink sm:text-base">
                {horizons.length > 0 ? (
                  <>
                    {horizons.map((h, i) => (
                      <span key={h}>
                        {i > 0 ? <span aria-hidden="true" className="text-faint/50">{" • "}</span> : null}
                        {h}
                      </span>
                    ))}
                  </>
                ) : (
                  <span className="text-faint/60">1 • 2 • 5 • 10 • 20 • 50 • 100 • 250 • 500</span>
                )}
                <span className="ml-2 text-[10px] uppercase tracking-[0.18em] text-faint">
                  events
                </span>
              </p>
              <p className="mt-auto pt-4 text-xs leading-relaxed text-faint">
                Horizons are measured in book updates (event time), not wall-clock time — matching
                how a latency-sensitive strategy actually observes the market.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
