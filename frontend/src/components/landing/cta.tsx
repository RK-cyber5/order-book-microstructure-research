"use client";

import { ArrowRight, Github } from "lucide-react";
import { Reveal } from "./reveal";
import { GITHUB_URL } from "./site-constants";

export function Cta() {
  return (
    <section aria-labelledby="cta-heading" className="px-4 pb-20 pt-4 sm:px-6 lg:px-8 lg:pb-28">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="blueprint-grid relative overflow-hidden rounded-2xl border border-navy-800 bg-[radial-gradient(120%_140%_at_80%_-10%,#1a2f52_0%,#0a1526_55%,#050d1b_100%)] px-6 py-14 text-center sm:px-10 lg:py-20">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(127,163,216,0.5),transparent)]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(29,91,230,0.28),transparent)] blur-2xl"
            />

            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-[#7fa3d8]">
              Open Research Lab
            </p>
            <h2
              id="cta-heading"
              className="mx-auto mt-5 max-w-3xl text-balance text-3xl font-semibold leading-[1.04] tracking-[-0.02em] text-white sm:text-4xl lg:text-[2.9rem]"
            >
              Explore the
              <br />
              Microstructure
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-[15px] leading-relaxed text-slate-300">
              Inspect the signals, assumptions, validation framework, cross-session behavior, and
              execution analysis.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <a
                href="/research"
                className="group inline-flex h-12 items-center gap-2.5 rounded-md bg-white px-6 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ink transition-all duration-200 hover:-translate-y-[1px] hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7fa3d8]"
              >
                Open Research Lab
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </a>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center gap-2.5 rounded-md border border-white/20 bg-white/[0.04] px-6 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm transition-all duration-200 hover:-translate-y-[1px] hover:border-white/40 hover:bg-white/[0.09] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7fa3d8]"
              >
                <Github className="h-4 w-4" aria-hidden="true" />
                View Source
                <span aria-hidden="true" className="text-slate-400">↗</span>
              </a>
            </div>

            <p className="mt-8 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
              No live trading · no profitability claims · every number traceable to generated
              research outputs
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
