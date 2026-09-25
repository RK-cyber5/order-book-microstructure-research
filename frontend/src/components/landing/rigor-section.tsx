"use client";

import { Blocks, FlaskConical, GitBranch, ShieldCheck, type LucideIcon } from "lucide-react";
import { SectionHeader } from "./section-header";
import { Reveal } from "./reveal";
import { useMethodology } from "@/hooks/use-research-data";

interface RigorCard {
  title: string;
  icon: LucideIcon;
  description: string;
  method: string;
}

export function RigorSection() {
  const { data: methodology, isError } = useMethodology();

  const cards: RigorCard[] = [
    {
      title: "Walk-Forward",
      icon: GitBranch,
      description:
        "Chronological cross-session evaluation. Every threshold and parameter is frozen on Session 1 before Session 2 is scored — no look-ahead, no cross-contamination.",
      method: methodology?.split_method ?? "Chronological cross-session evaluation",
    },
    {
      title: "HAC / Newey-West",
      icon: ShieldCheck,
      description:
        "Dependence-robust inference. Overlapping event-time returns violate independence; heteroskedasticity-and-autocorrelation-consistent standard errors keep test honest.",
      method: methodology?.inference_method ?? "HAC (Newey-West) via statsmodels OLS",
    },
    {
      title: "Block Bootstrap",
      icon: Blocks,
      description:
        "Dependence-aware uncertainty estimation. Stationary block resampling preserves the autocorrelation structure that naive resampling would destroy.",
      method: `${methodology?.bootstrap_method ?? "Stationary Block Bootstrap"} · block ${methodology?.bootstrap_block_size ?? 100}`,
    },
    {
      title: "FDR Control",
      icon: FlaskConical,
      description:
        "Multiple-testing correction. With many signal × horizon combinations, apparent significance appears by chance; Benjamini-Hochberg controls the false discovery rate.",
      method: methodology?.fdr_method ?? "Benjamini-Hochberg",
    },
  ];

  return (
    <section id="methodology" aria-labelledby="methodology-heading" className="border-t border-hairline bg-panel/50 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          index="06"
          eyebrow="Statistical Inference"
          title={
            <>
              Signal
              <br />
              Is Not Enough
            </>
          }
          lede="High-frequency observations are dependent, and many hypotheses are tested at once. Four layers of discipline separate structure from coincidence before any signal is taken seriously."
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <Reveal key={card.title} delay={i * 0.07}>
                <article className="group h-full rounded-xl border border-hairline bg-white p-6 transition-all duration-300 hover:-translate-y-[3px] hover:border-ink/20 hover:shadow-[0_18px_36px_-24px_rgba(10,27,51,0.3)]">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md border border-hairline bg-panel text-ink transition-colors group-hover:border-accent/35 group-hover:bg-accent-soft/40 group-hover:text-accent-deep">
                      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <span className="font-mono text-[10px] tracking-[0.18em] text-faint/60">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-5 font-mono text-[13px] font-semibold uppercase tracking-[0.1em] text-ink">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-xs leading-relaxed text-body">{card.description}</p>
                  <p className="mt-4 border-t border-hairline-soft pt-3 font-mono text-[9px] uppercase leading-relaxed tracking-[0.12em] text-faint">
                    {card.method}
                  </p>
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.1} className="mt-10">
          <div className="flex flex-col gap-5 rounded-xl border border-ink/15 bg-ink px-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:py-10">
            <p className="max-w-2xl text-balance text-[15px] font-medium leading-relaxed text-white sm:text-base">
              &ldquo;Naive IID inference can overstate apparent signal strength when observations
              are dependent and many hypotheses are tested.&rdquo;
            </p>
            <div className="shrink-0 border-t border-white/15 pt-4 font-mono text-[9.5px] uppercase leading-relaxed tracking-[0.16em] text-slate-400 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
              <p>Sanity null · shuffled target</p>
              <p className="mt-1 text-slate-200">
                {isError
                  ? "Unavailable — research API did not respond"
                  : `IC ${methodology?.sanity_null ? methodology.sanity_null.spearman_ic.toFixed(3) : "…"} · HAC p ${
                      methodology?.sanity_null ? methodology.sanity_null.p_value_hac.toFixed(3) : "…"
                    }`}
              </p>
              <p className="mt-1 text-slate-500">No signal survives randomization</p>
            </div>
          </div>
          <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            After FDR control, none of the predictive imbalance / flow signals reached significance.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
