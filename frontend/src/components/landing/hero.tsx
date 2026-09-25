"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Github } from "lucide-react";
import { BookSim } from "@/components/three/book-sim";
import { useResearchSummary } from "@/hooks/use-research-data";
import { GITHUB_URL } from "./site-constants";

const OrderBookStage = dynamic(
  () => import("@/components/three/order-book-stage").then((m) => m.OrderBookStage),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[400px] items-center justify-center rounded-xl border border-hairline bg-panel sm:h-[470px] lg:h-[540px] xl:h-[560px]">
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          Loading order-book scene
        </div>
      </div>
    ),
  },
);

export function Hero() {
  const reduce = useReducedMotion();
  const [sim] = useState(() => new BookSim());

  useEffect(() => {
    sim.start();
    return () => sim.stop();
  }, [sim]);

  const { data: summary, isError: summaryError, isLoading: summaryLoading } = useResearchSummary();

  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0.01 : 0.72, delay: reduce ? 0 : delay, ease: [0.21, 0.47, 0.32, 0.98] as const },
  });

  return (
    <section id="top" aria-label="Introduction" className="relative overflow-hidden">
      {/* Ambient light wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-[-10%] h-[560px] w-[720px] rounded-full bg-[radial-gradient(closest-side,rgba(29,91,230,0.07),transparent)] blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(29,91,230,0.25),transparent)]"
      />

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 pb-16 pt-28 sm:px-6 sm:pt-32 lg:grid-cols-[45fr_55fr] lg:gap-10 lg:px-8 lg:pb-24 lg:pt-36">
        {/* Copy */}
        <div>
          <motion.p
            {...fadeUp(0.05)}
            className="flex items-center gap-3 font-mono text-[11px] font-medium uppercase tracking-[0.3em] text-accent"
          >
            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-accent" />
            Quantitative Research
            <span aria-hidden="true" className="text-faint/50">•</span>
            <span className="text-faint">Market Microstructure</span>
          </motion.p>

          <motion.h1
            {...fadeUp(0.12)}
            className="mt-6 text-balance text-[2.6rem] font-semibold leading-[0.98] tracking-[-0.03em] text-ink sm:text-6xl lg:text-[4.2rem]"
          >
            Order Book
            <br />
            Microstructure
            <br />
            Lab
          </motion.h1>

          <motion.p {...fadeUp(0.2)} className="mt-6 max-w-xl text-pretty text-[15px] leading-relaxed text-body sm:text-base">
            A research-grade study of short-horizon price predictability, cross-session
            generalization, market regimes, latency, and execution costs using
            limit-order-book data.
          </motion.p>

          <motion.figure
            {...fadeUp(0.28)}
            className="mt-8 max-w-xl rounded-lg border border-hairline border-l-2 border-l-accent bg-panel/70 p-5"
          >
            <figcaption className="font-mono text-[9.5px] font-medium uppercase tracking-[0.24em] text-faint">
              Research Question
            </figcaption>
            <blockquote className="mt-2.5 text-pretty text-[15px] font-medium leading-relaxed text-ink-soft">
              &ldquo;Can information contained in the limit order book explain very
              short-horizon price movement — and does that relationship survive
              unseen data and execution costs?&rdquo;
            </blockquote>
          </motion.figure>

          <motion.div {...fadeUp(0.36)} className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#overview"
              className="group inline-flex h-12 items-center gap-2.5 rounded-md bg-ink px-6 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[0_8px_24px_-12px_rgba(10,27,51,0.5)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Explore Research
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center gap-2.5 rounded-md border border-hairline bg-white px-6 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ink transition-all duration-200 hover:-translate-y-[1px] hover:border-ink/30 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              View GitHub
              <span aria-hidden="true" className="text-faint">↗</span>
            </a>
          </motion.div>

          <motion.p
            {...fadeUp(0.44)}
            className="mt-7 font-mono text-[10px] uppercase tracking-[0.2em] text-faint"
          >
            {summary ? (
              <>
                Data · {summary.symbol} L2 · {summary.venue} · {summary.sessions_count} sessions ·{" "}
                {summary.total_l2_states.toLocaleString("en-US")} L2 states
              </>
            ) : summaryError ? (
              <>Data · research API unavailable</>
            ) : summaryLoading ? (
              <>Data · loading research outputs</>
            ) : (
              <>Data · research outputs pending</>
            )}
          </motion.p>
        </div>

        {/* 3D order-book stage */}
        <motion.div
          initial={{ opacity: 0, scale: reduce ? 1 : 0.975 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduce ? 0.01 : 0.9, delay: reduce ? 0 : 0.25, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="relative"
        >
          <OrderBookStage sim={sim} />
          <p className="mt-3 flex items-center justify-between font-mono text-[9.5px] uppercase tracking-[0.16em] text-faint/80">
            <span>X · price level&ensp;|&ensp;Y · depth&ensp;|&ensp;Z · event sequence</span>
            <span className="hidden sm:inline">Presentational simulation</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
