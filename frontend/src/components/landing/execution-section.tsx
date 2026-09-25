"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Gauge, Layers, Timer, TrendingDown, Zap, type LucideIcon } from "lucide-react";
import { SectionHeader } from "./section-header";
import { Reveal } from "./reveal";
import { ApiErrorPanel } from "./api-error-panel";
import { useExecutionData, useResearchSessions } from "@/hooks/use-research-data";

interface FlowStep {
  label: string;
  sub: string;
  icon: LucideIcon;
}

const FLOW: FlowStep[] = [
  { label: "Signal", sub: "statistical relationship", icon: Zap },
  { label: "Entry", sub: "aggressive taker entry", icon: ArrowRight },
  { label: "Latency", sub: "0–10 event delay", icon: Timer },
  { label: "Spread", sub: "cross on entry & exit", icon: Layers },
  { label: "Net Result", sub: "after all costs", icon: TrendingDown },
];

function Bar({
  label,
  value,
  max,
  scale,
  color,
  note,
  delay,
  negative = false,
}: {
  label: string;
  value: number;
  max: number;
  scale: number;
  color: string;
  note?: string;
  delay: number;
  negative?: boolean;
}) {
  const reduce = useReducedMotion();
  const widthPct = Math.max((Math.abs(value) / max) * 100, 0.9);
  return (
    <div className="py-3">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-body">{label}</p>
        <p className="font-mono text-xs font-semibold tabular-nums" style={{ color }}>
          {value >= 0 ? "" : "−"}
          {Math.abs(value).toFixed(scale)} bps
        </p>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-[3px] bg-hairline-soft">
        <motion.div
          className="h-full origin-left rounded-[3px]"
          style={{ backgroundColor: color, width: `${widthPct}%` }}
          initial={reduce ? undefined : { scaleX: 0 }}
          whileInView={reduce ? undefined : { scaleX: 1 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.9, delay, ease: [0.22, 0.61, 0.36, 1] }}
        />
      </div>
      {note ? <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-faint/80">{note}</p> : null}
      {negative ? <span className="sr-only">negative value</span> : null}
    </div>
  );
}

export function ExecutionSection() {
  const { data: execution, isLoading, isError, refetch } = useExecutionData();
  const { data: sessions } = useResearchSessions();
  const s1Spread = sessions?.find((s) => s.id === "Session_1")?.mean_relative_spread_bps;
  const s2Spread = sessions?.find((s) => s.id === "Session_2")?.mean_relative_spread_bps;
  const hasModeled = Boolean(execution?.session_1);
  const maxScale = 4;

  return (
    <section id="execution" aria-labelledby="execution-heading" className="border-t border-hairline bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          index="07"
          eyebrow="Execution Economics"
          title={
            <>
              From Statistical Edge
              <br />
              to Real Execution
            </>
          }
          lede="A relationship that survives statistics still has to survive the market. Under the tested aggressive execution assumptions, every step from signal to fill subtracts from the gross effect."
        />

        {/* Flow */}
        <Reveal delay={0.06} className="mt-10">
          <ol className="flex flex-wrap items-stretch gap-2 lg:flex-nowrap lg:gap-0" aria-label="Execution pipeline">
            {FLOW.map((step, i) => {
              const Icon = step.icon;
              return (
                <li key={step.label} className="flex flex-1 items-center gap-2 lg:gap-0">
                  <div className="w-full flex-1 rounded-lg border border-hairline bg-panel/60 px-4 py-3.5 transition-colors hover:border-accent/35 hover:bg-accent-soft/30">
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">
                        {step.label}
                      </p>
                    </div>
                    <p className="mt-1 pl-[26px] text-[10.5px] text-faint">{step.sub}</p>
                  </div>
                  {i < FLOW.length - 1 ? (
                    <span aria-hidden="true" className="hidden font-mono text-faint/60 lg:block lg:px-1.5">
                      →
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </Reveal>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          {/* Modeled cost chart */}
          <Reveal delay={0.1}>
            <div className="h-full rounded-xl border border-hairline bg-white p-6 shadow-[0_20px_50px_-40px_rgba(10,27,51,0.35)] sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline-soft pb-4">
                <h3 className="font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-faint">
                  Session 01 · modeled execution
                </h3>
                <span className="inline-flex items-center gap-1.5 rounded border border-hairline bg-panel px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-body">
                  <Gauge className="h-3 w-3" aria-hidden="true" />
                  Modeled · not live
                </span>
              </div>

              <div className="mt-3 divide-y divide-hairline-soft">
                {isError ? (
                  <div className="py-6">
                    <ApiErrorPanel
                      compact
                      message="The modeled-execution research output (results/cost_analysis.csv, results/session_latency.csv) could not be loaded. No bars are shown rather than fabricated ones."
                      onRetry={() => void refetch()}
                    />
                  </div>
                ) : !hasModeled ? (
                  <div className="flex h-28 items-center gap-3 py-6 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                    {isLoading ? "Loading modeled execution output" : "Modeled execution output pending"}
                  </div>
                ) : (
                  <>
                    <Bar
                      label="Gross signal effect"
                      value={execution!.session_1.gross_bps}
                      max={maxScale}
                      scale={3}
                      color="#1d5be6"
                      note="≈ 0.1% of the modeled cost — effectively invisible at true scale"
                      delay={0.1}
                    />
                    <Bar
                      label="Spread + latency cost"
                      value={execution!.session_1.spread_cost_bps}
                      max={maxScale}
                      scale={1}
                      color="#3d4c63"
                      note="aggressive taker · crossing the spread on entry and exit"
                      delay={0.25}
                    />
                    <Bar
                      label="Net result"
                      value={execution!.session_1.net_bps}
                      max={maxScale}
                      scale={1}
                      color="#c94b4b"
                      note="the statistical effect does not survive the cost of trading it"
                      delay={0.4}
                      negative
                    />
                  </>
                )}
              </div>

              <p className="mt-5 border-t border-hairline-soft pt-4 text-xs leading-relaxed text-faint">
                {typeof s1Spread === "number" && typeof s2Spread === "number"
                  ? `Session 2 mean spreads were roughly ${s2Spread >= s1Spread ? `${(s2Spread / s1Spread).toFixed(0)}×` : ""} wider (~${s2Spread.toFixed(1)} bps vs ~${s1Spread.toFixed(1)} bps), making the same crossing assumption even more demanding on the unseen session.`
                  : "Session 2 exhibited substantially wider spreads, making the same crossing assumption even more demanding on the unseen session."}
              </p>
            </div>
          </Reveal>

          {/* Latency sensitivity */}
          <Reveal delay={0.18}>
            <div className="flex h-full flex-col rounded-xl border border-hairline bg-panel/60 p-6 sm:p-7">
              <div className="border-b border-hairline-soft pb-4">
                <h3 className="font-mono text-[10.5px] font-medium uppercase tracking-[0.22em] text-faint">
                  Latency sensitivity · gross effect
                </h3>
                <p className="mt-1 text-xs text-faint">
                  How the remaining gross effect decays as execution is delayed in event time.
                </p>
              </div>

              <div className="mt-4 flex-1">
                {isError ? (
                  <div className="flex h-24 items-center font-mono text-[10px] uppercase tracking-[0.18em] text-ask">
                    Latency curve unavailable — research API did not respond.
                  </div>
                ) : (execution?.latency_curve_session_1?.length ?? 0) > 0 ? (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th scope="col" className="pb-2 text-left font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-faint">
                          Delay · events
                        </th>
                        {execution!.latency_curve_session_1.map((row) => (
                          <th key={row.latency_events} scope="col" className="pb-2 text-right font-mono text-[11px] font-semibold tabular-nums text-ink">
                            {row.latency_events}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-hairline-soft">
                        <td className="pt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
                          Gross · bps
                        </td>
                        {execution!.latency_curve_session_1.map((row) => (
                          <td key={row.latency_events} className="pt-3 text-right font-mono text-[11px] font-semibold tabular-nums text-body">
                            {row.gross_bps.toFixed(4)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-t border-hairline-soft">
                        <td className="pt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
                          IC
                        </td>
                        {execution!.latency_curve_session_1.map((row) => (
                          <td key={row.latency_events} className="pt-3 text-right font-mono text-[11px] tabular-nums text-faint">
                            {row.ic === null ? "—" : row.ic.toFixed(3)}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <div className="flex h-24 items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                    <span>{isLoading ? "Loading latency curve…" : "Latency curve pending"}</span>
                  </div>
                )}
              </div>

              <p className="mt-4 border-t border-hairline-soft pt-4 text-xs leading-relaxed text-body">
                Delaying execution by even <span className="font-semibold text-ink">5 events</span>{" "}
                effectively eliminated the remaining gross effect; at a 10-event delay it is
                exactly zero in the tested sample.
              </p>
            </div>
          </Reveal>
        </div>

        {/* Statement */}
        <Reveal delay={0.12} className="mt-8">
          <div className="rounded-xl border border-hairline bg-panel/60 px-6 py-6 sm:px-8">
            <p className="text-balance text-[15px] font-medium leading-relaxed text-ink sm:text-base">
              {execution?.statement ??
                "Gross signal effects were substantially smaller than the modeled spread and latency costs under the tested aggressive execution assumptions."}
            </p>
            <p className="mt-3 font-mono text-[9.5px] uppercase leading-relaxed tracking-[0.14em] text-faint">
              {execution?.caveat ??
                "Modeled execution only. No live trading was performed and no profitability claim is made; passive execution was not evaluated."}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
