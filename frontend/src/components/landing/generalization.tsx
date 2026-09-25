"use client";

import { CountUp } from "./count-up";
import { SectionHeader } from "./section-header";
import { Reveal } from "./reveal";
import { ApiErrorPanel } from "./api-error-panel";
import { useResearchSessions } from "@/hooks/use-research-data";
import type { ResearchSession } from "@/lib/research";
import { cn } from "@/lib/utils";

function Sparkline({ session, accent }: { session?: ResearchSession; accent: boolean }) {
  const W = 232;
  const H = 58;
  const curve = session?.l1_ic_curve ?? [];
  const yMax = 0.5;
  const xOf = (h: number) => 8 + (Math.log10(h) / Math.log10(500)) * (W - 20);
  const yOf = (v: number) => H - 12 - (Math.max(0, v) / yMax) * (H - 20);
  const color = accent ? "#1d5be6" : "#64748b";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[58px] w-full" role="img" aria-label={`L1 imbalance information coefficient by horizon, ${session?.label ?? "loading"}`}>
      <line x1={8} x2={W - 12} y1={H - 12} y2={H - 12} stroke="#e7ebf2" />
      {curve.length > 0 ? (
        <>
          <path
            d={curve.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.horizon).toFixed(1)},${yOf(p.ic).toFixed(1)}`).join(" ")}
            fill="none"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
          {curve.map((p) => (
            <circle key={p.horizon} cx={xOf(p.horizon)} cy={yOf(p.ic)} r={2.2} fill="#fff" stroke={color} strokeWidth={1.4} />
          ))}
        </>
      ) : (
        <line x1={8} x2={W - 12} y1={H / 2} y2={H / 2} stroke="#e7ebf2" strokeDasharray="3 3" />
      )}
      <text x={8} y={10} fontFamily="var(--font-geist-mono), monospace" fontSize="7.5" fill="#8a97ab" letterSpacing="1.2">
        L1 IC · HORIZON 1–500
      </text>
    </svg>
  );
}

function SessionPanel({ session, unseen }: { session?: ResearchSession; unseen: boolean }) {
  return (
    <article
      className={cn(
        "relative h-full rounded-xl border bg-white p-6 sm:p-7",
        unseen ? "border-accent/40 shadow-[0_24px_50px_-34px_rgba(20,56,158,0.35)]" : "border-hairline",
      )}
    >
      {unseen ? (
        <span className="absolute -top-2.5 right-5 rounded border border-accent/40 bg-white px-2 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.2em] text-accent-deep">
          The real test
        </span>
      ) : null}

      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hairline-soft pb-4">
        <div>
          <h3 className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-ink">
            {session?.label ?? "SESSION —"}
          </h3>
          <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.2em] text-faint">
            {session?.role ?? "loading…"}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 font-mono text-[9px] font-medium uppercase tracking-[0.16em]",
            unseen ? "border-accent/30 bg-accent-soft/50 text-accent-deep" : "border-hairline bg-panel text-body",
          )}
        >
          {unseen ? "Held-out" : "Development"}
        </span>
      </header>

      <dl className="mt-5 grid grid-cols-3 gap-4">
        <div>
          <dd className="font-mono text-2xl font-semibold tracking-[-0.01em] tabular-nums text-ink sm:text-[1.7rem]">
            <CountUp value={session?.valid_l2_states} placeholder="—" />
          </dd>
          <dt className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
            Valid L2 states
          </dt>
        </div>
        <div>
          <dd className="font-mono text-2xl font-semibold tracking-[-0.01em] tabular-nums text-ink sm:text-[1.7rem]">
            <CountUp value={session?.mean_relative_spread_bps} decimals={1} prefix="~" suffix=" bps" placeholder="—" />
          </dd>
          <dt className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
            Mean rel. spread
          </dt>
        </div>
        <div>
          <dd
            className={cn(
              "font-mono text-2xl font-semibold tracking-[-0.01em] tabular-nums sm:text-[1.7rem]",
              unseen ? "text-accent-deep" : "text-ink",
            )}
          >
            <CountUp value={session?.l1_ic_at_10_events} decimals={3} placeholder="—" />
          </dd>
          <dt className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
            L1 IC @ 10 events
          </dt>
        </div>
      </dl>

      <div className="mt-5 border-t border-hairline-soft pt-4">
        <Sparkline session={session} accent={unseen} />
      </div>

      <footer className="mt-4 flex items-baseline justify-between font-mono text-[9px] uppercase tracking-[0.14em] text-faint/80">
        <span>Time span ~{session ? session.time_span_hours.toFixed(2) : "—"} h</span>
        <span>{unseen ? "Unseen / out-of-sample" : "Train / development"}</span>
      </footer>
    </article>
  );
}

export function Generalization() {
  const { data: sessions, isError, refetch } = useResearchSessions();
  const s1 = sessions?.find((s) => s.id === "Session_1");
  const s2 = sessions?.find((s) => s.id === "Session_2");

  return (
    <section id="generalization" aria-labelledby="generalization-heading" className="border-t border-hairline bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          index="05"
          eyebrow="Generalization"
          title={
            <>
              The Real Test
              <br />
              Is Unseen Data
            </>
          }
          lede="Session 1 is where signals are discovered and every parameter is fixed. Session 2 is never touched until evaluation. What remains after that crossing is the only evidence that counts."
        />

        {isError ? (
          <Reveal className="mb-6">
            <ApiErrorPanel
              compact
              message="Session statistics could not be loaded from the research API, so the panels below show no values rather than fabricated ones."
              onRetry={() => void refetch()}
            />
          </Reveal>
        ) : null}

        <div className={cn("relative grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:gap-4", isError ? "mt-6" : "mt-12")}>
          <Reveal>
            <SessionPanel session={s1} unseen={false} />
          </Reveal>

          <div aria-hidden="true" className="flex items-center justify-center py-2 lg:py-0">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-hairline bg-white font-mono text-xl font-semibold text-faint shadow-sm">
              ≠
            </div>
          </div>

          <Reveal delay={0.1}>
            <SessionPanel session={s2} unseen={true} />
          </Reveal>
        </div>

        <Reveal delay={0.12} className="mt-10">
          <div className="rounded-xl border border-ink/15 bg-ink px-6 py-8 text-center sm:py-10">
            <p className="font-mono text-base font-semibold uppercase tracking-[0.3em] text-white sm:text-lg">
              In-sample <span className="text-[#7fa3d8]">≠</span> out-of-sample
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
              An apparent signal in development data is a hypothesis, not a result. Session 2
              exhibited wider spreads and different order-flow conditions — a cross-session
              distribution shift observed alongside changes in signal behavior.
            </p>
          </div>
          <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
            Cross-session differences are observed, not interpreted as causal.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
