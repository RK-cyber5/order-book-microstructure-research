"use client";

/**
 * RESEARCH OVERVIEW — dataset metadata, session inventory (train/test),
 * feature & horizon inventory, and the data-provenance legend.
 * Every value comes from the research API (summary / sessions / methodology).
 */

import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { researchApi, type ResearchSession } from "@/lib/research";
import { FEATURE_SHORT_LABELS } from "@/components/landing/site-constants";
import {
  Micro,
  NoteStrip,
  PanelShell,
  ProvenanceBadge,
  QueryState,
  StatCell,
  fmt,
} from "./primitives";
import type { ResearchView } from "./research-terminal";

export function OverviewPanel({
  onNavigate,
}: {
  onNavigate?: (view: ResearchView) => void;
}) {
  const summary = useQuery({
    queryKey: ["research", "summary"],
    queryFn: researchApi.summary,
  });
  const sessions = useQuery({
    queryKey: ["research", "sessions"],
    queryFn: researchApi.sessions,
  });
  const methodology = useQuery({
    queryKey: ["research", "methodology"],
    queryFn: researchApi.methodology,
  });

  return (
    <div className="flex flex-col gap-4">
      {/* ------------------------------------------------ DATASET ---- */}
      <PanelShell
        id="dataset"
        title="Dataset"
        meta="BTCUSDT · BINANCE US"
        badge={<ProvenanceBadge kind="research" compact />}
      >
        <QueryState
          isLoading={summary.isLoading}
          error={summary.error}
          data={summary.data}
          onRetry={() => summary.refetch()}
          skeleton="LOADING DATASET METADATA…"
        >
          {(s) => (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                <StatCell label="Symbol" value={s.symbol} />
                <StatCell label="Venue" value={s.venue} />
                <StatCell label="Valid L2 States" value={fmt.int(s.total_l2_states)} />
                <StatCell label="Sessions" value={s.sessions_count} />
                <StatCell label="Market Time" value={`~${s.market_time_hours}`} unit="h" />
                <StatCell
                  label="Unseen L1 IC @10"
                  value={fmt.dec(s.unseen_l1_ic_at_10_events, 3)}
                  tone="accent"
                  hint={s.unseen_l1_ic_description}
                />
              </div>
              <p className="mt-3 font-mono text-[10px] leading-relaxed text-faint">
                SOURCE · {s.source_files.join("  ·  ")}
              </p>
            </>
          )}
        </QueryState>
      </PanelShell>

      {/* -------------------------------------------- SESSIONS ---- */}
      <PanelShell
        id="sessions"
        title="Sessions — Chronological Train / Test Design"
        meta="SESSION 01 = DEVELOPMENT · SESSION 02 = UNSEEN"
        badge={<ProvenanceBadge kind="research" compact />}
      >
        <QueryState
          isLoading={sessions.isLoading}
          error={sessions.error}
          data={sessions.data}
          onRetry={() => sessions.refetch()}
          skeleton="LOADING SESSION INVENTORY…"
        >
          {(list) => (
            <div className="grid gap-3 lg:grid-cols-2">
              {list.map((s, idx) => (
                <SessionCard key={s.id} session={s} train={idx === 0} />
              ))}
            </div>
          )}
        </QueryState>
        <NoteStrip tone="neutral" className="mt-3">
          Cross-session walk-forward: parameters frozen on Session 01, evaluated on
          unseen Session 02. The sessions differ in spread regime — see
          GENERALIZATION for the observed distribution shift (not a causal claim).
        </NoteStrip>
      </PanelShell>

      {/* ----------------------------------- FEATURES & HORIZONS ---- */}
      <PanelShell
        id="inventory"
        title="Research Inventory — Features & Horizons"
        meta="EVENT-TIME DESIGN"
        badge={<ProvenanceBadge kind="research" compact />}
      >
        <QueryState
          isLoading={methodology.isLoading}
          error={methodology.error}
          data={methodology.data}
          onRetry={() => methodology.refetch()}
          skeleton="LOADING RESEARCH INVENTORY…"
        >
          {(m) => (
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <Micro>Features (microstructure signals)</Micro>
                <ul className="mt-2 grid grid-cols-2 gap-1.5">
                  {m.features
                    .filter((f) => f.key in FEATURE_SHORT_LABELS)
                    .map((f) => (
                      <li
                        key={f.key}
                        className="border border-hairline bg-panel px-2 py-1.5 font-mono text-[10px] font-semibold text-ink"
                      >
                        {f.label}
                      </li>
                    ))}
                </ul>
                <p className="mt-2 font-mono text-[9px] leading-relaxed text-faint">
                  TARGET · future event-time return ret_h over each horizon
                </p>
              </div>
              <div>
                <Micro>Prediction horizons (events)</Micro>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.horizons_events.map((h) => (
                    <span
                      key={h}
                      className="inline-flex h-7 min-w-9 items-center justify-center rounded-sm border border-hairline bg-panel px-2 font-mono text-[9.5px] font-semibold tabular-nums text-body"
                    >
                      {h}
                    </span>
                  ))}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-[9.5px] text-body">
                  <div>
                    <dt className="uppercase tracking-[0.14em] text-faint">Inference</dt>
                    <dd className="mt-0.5 text-ink">{m.inference_method}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[0.14em] text-faint">Bootstrap</dt>
                    <dd className="mt-0.5 text-ink">
                      {m.bootstrap_method} · block {m.bootstrap_block_size}
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[0.14em] text-faint">FDR</dt>
                    <dd className="mt-0.5 text-ink">{m.fdr_method}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[0.14em] text-faint">Seed</dt>
                    <dd className="mt-0.5 text-ink">{m.random_seed}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </QueryState>
      </PanelShell>

      {/* ------------------------------------- PROVENANCE LEGEND ---- */}
      <PanelShell id="provenance" title="Data Provenance — Two Tiers">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="border border-emerald-600/20 bg-emerald-50/50 p-3">
            <ProvenanceBadge kind="research" />
            <p className="mt-2 text-[11.5px] leading-relaxed text-body">
              Published statistical research outputs — dataset statistics, signal
              information coefficients, confidence intervals, inference and
              execution analysis. Served verbatim from the generated research
              outputs; every number traces to a results file.
            </p>
          </div>
          <div className="border border-amber-500/25 bg-amber-50/50 p-3">
            <ProvenanceBadge kind="reconstructed" />
            <p className="mt-2 text-[11.5px] leading-relaxed text-body">
              Raw event-level L2 data is not published with this repository. The
              order-book replay and 3D book visualizations are deterministic
              reconstructions calibrated to the published research outputs —
              never presented as raw exchange data or live market data.
            </p>
          </div>
        </div>
      </PanelShell>

      {/* ---------------------------------------- LAB SHORTCUTS ---- */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            { view: "replay", title: "Replay Lab", desc: "Reconstructed book · event controls · 3D depth" },
            { view: "signals", title: "Signal Lab", desc: "IC analysis · inference · signal space" },
            { view: "generalization", title: "Generalization Lab", desc: "Train vs unseen · distribution shift" },
            { view: "execution", title: "Execution Lab", desc: "Modeled costs · latency surface" },
          ] as const
        ).map((l) => (
          <button
            key={l.view}
            type="button"
            onClick={() => onNavigate?.(l.view)}
            className="group flex flex-col rounded-md border border-hairline bg-white p-3 text-left transition-all hover:-translate-y-[1px] hover:border-ink/25 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-accent"
          >
            <span className="flex items-center justify-between font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink">
              {l.title}
              <ArrowRight
                className="h-3 w-3 text-faint transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
            <span className="mt-1.5 text-[10.5px] leading-relaxed text-faint">{l.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Session card with L1 IC-vs-horizon sparkline                       */
/* ------------------------------------------------------------------ */

function SessionCard({ session, train }: { session: ResearchSession; train: boolean }) {
  const curve = session.l1_ic_curve;
  const w = 220;
  const h = 44;
  const maxIc = Math.max(0.05, ...curve.map((p) => p.ic));
  const path = curve
    .map((p, i) => {
      const x = (i / Math.max(1, curve.length - 1)) * (w - 4) + 2;
      const y = h - 4 - (Math.max(0, p.ic) / maxIc) * (h - 10);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <article
      className={`rounded-md border p-3 ${
        train ? "border-hairline bg-panel/60" : "border-accent/30 bg-accent-soft/40"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-ink">
          {session.label}
        </h3>
        <span
          className={`rounded border px-1.5 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.14em] ${
            train
              ? "border-ink/20 bg-white text-body"
              : "border-accent/40 bg-white text-accent-deep"
          }`}
        >
          {session.role}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCell label="Valid L2 States" value={fmt.int(session.valid_l2_states)} />
        <StatCell label="Mean Rel. Spread" value={`~${fmt.dec(session.mean_relative_spread_bps, 1)}`} unit="bps" />
        <StatCell label="Time Span" value={`~${fmt.dec(session.time_span_hours, 2)}`} unit="h" />
        <StatCell
          label="L1 IC @ 10 ev"
          value={fmt.dec(session.l1_ic_at_10_events, 3)}
          tone={train ? "default" : "accent"}
        />
      </div>
      <figure className="mt-3 border border-hairline bg-white p-2">
        <figcaption className="flex items-baseline justify-between font-mono text-[8.5px] uppercase tracking-[0.16em] text-faint">
          <span>Spearman IC vs horizon</span>
          <span className="tabular-nums">h ∈ [{curve[0]?.horizon ?? 1}…{curve[curve.length - 1]?.horizon ?? 500}]</span>
        </figcaption>
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="mt-1 h-11 w-full"
          role="img"
          aria-label={`${session.label} L1 imbalance Spearman IC versus prediction horizon`}
        >
          <line x1="2" y1={h - 4} x2={w - 2} y2={h - 4} stroke="#e7ebf2" strokeWidth="1" />
          <path d={path} fill="none" stroke={train ? "#16294d" : "#1d5be6"} strokeWidth="1.6" />
        </svg>
      </figure>
    </article>
  );
}
