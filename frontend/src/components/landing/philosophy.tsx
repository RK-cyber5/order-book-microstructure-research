"use client";

import { ChevronRight } from "lucide-react";
import { SectionHeader } from "./section-header";
import { Reveal } from "./reveal";

const STEPS = [
  {
    name: "Discover",
    description: "Observe a pattern in the book — imbalance, flow, microprice — and quantify it honestly.",
  },
  {
    name: "Validate",
    description: "Test it with dependence-aware statistics: HAC errors, block bootstrap, FDR control.",
  },
  {
    name: "Challenge",
    description: "Attack it — null permutations, regime splits, latency decay, execution costs.",
  },
  {
    name: "Generalize",
    description: "Freeze every parameter, then score the signal on a session it has never seen.",
  },
  {
    name: "Execute",
    description: "Ask what survives crossing the spread. Only then interpret what it means.",
  },
];

export function Philosophy() {
  return (
    <section aria-labelledby="philosophy-heading" className="border-t border-hairline bg-panel/50 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          index="08"
          eyebrow="Research Philosophy"
          title={
            <>
              Research Before
              <br />
              Narrative
            </>
          }
        />

        <Reveal delay={0.08}>
          <blockquote className="mt-8 max-w-4xl text-balance text-2xl font-semibold leading-snug tracking-[-0.01em] text-ink sm:text-3xl lg:text-[2.1rem]">
            &ldquo;An apparent signal is only the beginning of the investigation.&rdquo;
          </blockquote>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-body">
            The discipline of this study is the order of operations: evidence first, interpretation
            second — and the exit door of &ldquo;no tradable edge&rdquo; left open at every stage.
          </p>
        </Reveal>

        <Reveal delay={0.14} className="mt-12">
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Research philosophy stages">
            {STEPS.map((step, i) => (
              <li key={step.name} className="relative">
                {i < STEPS.length - 1 ? (
                  <ChevronRight
                    aria-hidden="true"
                    className="absolute -right-[11px] top-[38px] z-10 hidden h-4 w-4 text-faint/50 lg:block"
                  />
                ) : null}
                <div className="group h-full rounded-lg border border-hairline bg-white p-5 transition-all duration-300 hover:-translate-y-[2px] hover:border-accent/40 hover:shadow-[0_14px_30px_-20px_rgba(10,27,51,0.25)]">
                  <p className="flex items-baseline justify-between">
                    <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-ink">
                      {step.name}
                    </span>
                    <span className="font-mono text-[10px] tracking-[0.16em] text-faint/60">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-faint transition-colors group-hover:text-body">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
