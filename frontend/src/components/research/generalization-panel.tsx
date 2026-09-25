"use client";

/**
 * GENERALIZATION LAB — train (Session 01) vs unseen (Session 02) analysis.
 *
 * Every value is published research output from /api/research/generalization:
 * session forensics, feature distribution shift (results/feature_shift.csv)
 * and cross-session train/test IC with 95% bootstrap CIs
 * (results/horizon_analysis.csv). The observed shift is stated as an
 * observation, never as a causal claim.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { researchApi, type CrossSessionRow, type ResearchSession } from "@/lib/research";
import { cn } from "@/lib/utils";
import {
  ChipToggle,
  Micro,
  NaCell,
  NoteStrip,
  PanelShell,
  ProvenanceBadge,
  QueryState,
  StatCell,
  TerminalSelect,
  fmt,
  tableCls,
} from "./primitives";
import type { GenMode } from "./generalization-3d";

const Generalization3D = dynamic(
  () => import("./generalization-3d").then((m) => m.Generalization3D),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[340px] items-center justify-center font-mono text-[10px] uppercase tracking-[0.2em] text-faint sm:h-[400px] lg:h-[440px]">
        <span className="mr-3 h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
        LOADING TRAIN/TEST LANDSCAPE…
      </div>
    ),
  },
);

const FEATURE_LABELS: Record<string, string> = {
  l1_imb: "L1 Imbalance",
  l5_imb_1k: "L5 Imbalance (1/k)",
  l5_imb_uni: "L5 Imbalance (uniform)",
  microprice_dev: "Microprice Deviation",
  ofi: "OFI",
  rel_spread: "Relative Spread",
  best_bid_sz: "Best Bid Size",
};

const LAB_FEATURES = ["l1_imb", "l5_imb_1k", "microprice_dev", "ofi"] as const;

export function GeneralizationPanel() {
  const gen = useQuery({
    queryKey: ["research", "generalization"],
    queryFn: researchApi.generalization,
  });

  const [chartFeature, setChartFeature] = useState<string>("l1_imb");
  const [mode, setMode] = useState<GenMode>("overlay");

  const sessions = gen.data?.sessions ?? [];
  const s1 = sessions[0];
  const s2 = sessions[1];
  const rows = gen.data?.cross_session ?? [];
  const featureRows = useMemo(
    () => rows.filter((r) => r.feature === chartFeature).sort((a, b) => a.horizon - b.horizon),
    [rows, chartFeature],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* -------------------------------------- side-by-side cards ---- */}
      <PanelShell
        id="gen-sessions"
        title="Generalization — Train vs Unseen Session"
        meta="SESSION 01 = DEVELOPMENT / TRAIN · SESSION 02 = UNSEEN / OUT-OF-SAMPLE"
        badge={<ProvenanceBadge kind="research" compact />}
      >
        <QueryState
          isLoading={gen.isLoading}
          error={gen.error}
          data={gen.data}
          onRetry={() => gen.refetch()}
          skeleton="LOADING SESSION COMPARISON…"
        >
          {() => (
            <div className="grid gap-3 lg:grid-cols-2">
              {sessions.map((s, idx) => (
                <GenSessionCard key={s.id} session={s} train={idx === 0} />
              ))}
            </div>
          )}
        </QueryState>
        <NoteStrip tone="amber" icon="⚠" className="mt-3">
          {gen.data?.shift_disclaimer ??
            "OBSERVED DISTRIBUTION SHIFT — NOT A CAUSAL CLAIM."}{" "}
          The data does not establish that spread differences caused the signal
          differences.
        </NoteStrip>
      </PanelShell>

      {/* -------------------------------- feature distribution shift ---- */}
      <PanelShell
        id="gen-shift"
        title="Feature Distribution Comparison"
        meta="RESULTS/FEATURE_SHIFT.CSV · KS TWO-SAMPLE"
        badge={<ProvenanceBadge kind="research" compact />}
      >
        <QueryState
          isLoading={gen.isLoading}
          error={gen.error}
          data={gen.data}
          onRetry={() => gen.refetch()}
          skeleton="LOADING DISTRIBUTION SHIFT…"
        >
          {(d) => (
            <div className="grid gap-3 lg:grid-cols-[1fr_minmax(260px,1fr)]">
              <div className="max-h-96 overflow-auto border border-hairline bg-white [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-ink/15 [&::-webkit-scrollbar-track]:bg-transparent">
                <table className={cn(tableCls.table, "min-w-[520px]")}>
                  <thead>
                    <tr>
                      <th className={tableCls.th}>Feature</th>
                      <th className={cn(tableCls.th, "text-right")}>S01 Mean</th>
                      <th className={cn(tableCls.th, "text-right")}>S02 Mean</th>
                      <th className={cn(tableCls.th, "text-right")}>S01 Std</th>
                      <th className={cn(tableCls.th, "text-right")}>S02 Std</th>
                      <th className={cn(tableCls.th, "text-right")}>KS Stat</th>
                      <th className={cn(tableCls.th, "text-right")}>KS p</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.feature_shift.map((r) => (
                      <tr key={r.feature} className="transition-colors hover:bg-panel/70">
                        <td className={cn(tableCls.td, "font-semibold text-ink")}>
                          {FEATURE_LABELS[r.feature] ?? r.feature}
                        </td>
                        <td className={tableCls.tdNum}>{fmt.dec(r.s1_mean, 4)}</td>
                        <td className={tableCls.tdNum}>{fmt.dec(r.s2_mean, 4)}</td>
                        <td className={tableCls.tdNum}>{fmt.dec(r.s1_std, 4)}</td>
                        <td className={tableCls.tdNum}>{fmt.dec(r.s2_std, 4)}</td>
                        <td className={tableCls.tdNum}>{fmt.dec(r.ks_stat, 4)}</td>
                        <td className={tableCls.tdNum}>
                          {r.ks_pval === null ? <NaCell /> : fmt.sci(r.ks_pval)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ShiftPlot rows={gen.data?.feature_shift ?? []} />
            </div>
          )}
        </QueryState>
        <NoteStrip tone="neutral" className="mt-3">
          Feature means, standard deviations and two-sample Kolmogorov-Smirnov
          statistics between the sessions. p-values are served verbatim from the
          research output (0.0 = reported as zero by the upstream analysis).
        </NoteStrip>
      </PanelShell>

      {/* ------------------------------------ spread comparison ---- */}
      <PanelShell
        id="gen-spread"
        title="Spread Regime Comparison"
        meta="SESSION FORENSICS"
        badge={<ProvenanceBadge kind="research" compact />}
      >
        <QueryState
          isLoading={gen.isLoading}
          error={gen.error}
          data={s1 && s2 ? { s1, s2 } : undefined}
          onRetry={() => gen.refetch()}
          skeleton="LOADING SPREAD COMPARISON…"
        >
          {({ s1, s2 }) => (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <StatCell label="S01 Mean Rel Spread" value={`~${fmt.dec(s1.mean_relative_spread_bps, 1)}`} unit="bps" />
              <StatCell label="S02 Mean Rel Spread" value={`~${fmt.dec(s2.mean_relative_spread_bps, 1)}`} unit="bps" />
              <StatCell
                label="Spread Ratio S02/S01"
                value={`≈ ${fmt.dec(s2.mean_relative_spread_bps / Math.max(1e-9, s1.mean_relative_spread_bps), 1)}×`}
                hint="Ratio of the two published mean relative spreads (display arithmetic only)"
              />
              <StatCell label="S01 Median Spread" value={fmt.dec(s1.median_spread_raw, 2)} unit="raw" />
              <StatCell label="S02 Median Spread" value={fmt.dec(s2.median_spread_raw, 2)} unit="raw" />
              <StatCell
                label="Durations"
                value={`${fmt.dec(s1.time_span_hours, 2)} / ${fmt.dec(s2.time_span_hours, 2)}`}
                unit="h"
                hint="Session 01 / Session 02 market time"
              />
            </div>
          )}
        </QueryState>
        <NoteStrip tone="neutral" className="mt-3">
          Session 02 traded in a much wider spread regime (~{fmt.dec(s2?.mean_relative_spread_bps ?? null, 1)} bps vs
          ~{fmt.dec(s1?.mean_relative_spread_bps ?? null, 1)} bps). This is the observed
          distribution shift; the study design does not attribute causality.
        </NoteStrip>
      </PanelShell>

      {/* -------------------------------------- IC comparison chart ---- */}
      <PanelShell
        id="gen-ic"
        title="IC Comparison — Train vs Test"
        meta="TRAIN = SESSION 01 · TEST = UNSEEN SESSION 02 · 95% BLOCK-BOOTSTRAP CIs"
        badge={<ProvenanceBadge kind="research" compact />}
      >
        <div className="mb-3 w-44">
          <TerminalSelect
            label="Feature"
            value={chartFeature}
            options={LAB_FEATURES.map((f) => ({ value: f, label: FEATURE_LABELS[f] }))}
            onChange={setChartFeature}
          />
        </div>
        <QueryState
          isLoading={gen.isLoading}
          error={gen.error}
          data={featureRows.length > 0 ? featureRows : undefined}
          onRetry={() => gen.refetch()}
          skeleton="LOADING TRAIN/TEST IC…"
        >
          {(rows) => <TrainTestChart rows={rows} featureLabel={FEATURE_LABELS[chartFeature] ?? chartFeature} />}
        </QueryState>
        <NoteStrip tone="neutral" className="mt-3">
          Train (Session 01) versus test (unseen Session 02) Spearman IC with
          95% block-bootstrap confidence intervals, per horizon —
          results/horizon_analysis.csv. Values served verbatim; missing values
          are never interpolated.
        </NoteStrip>
      </PanelShell>

      {/* --------------------------------------- generalization 3D ---- */}
      <PanelShell
        id="gen-3d"
        title="Train / Test IC Landscape — 3D"
        meta="X = HORIZON · Y = FEATURE · Z = IC"
        badge={<ProvenanceBadge kind="research" compact />}
      >
        <div className="mb-3 flex flex-wrap gap-1.5">
          <ChipToggle label="Session 01" pressed={mode === "s1"} onClick={() => setMode("s1")} />
          <ChipToggle label="Session 02" pressed={mode === "s2"} onClick={() => setMode("s2")} />
          <ChipToggle label="Overlay" pressed={mode === "overlay"} onClick={() => setMode("overlay")} />
        </div>
        <QueryState
          isLoading={gen.isLoading}
          error={gen.error}
          data={rows.length > 0 ? rows : undefined}
          onRetry={() => gen.refetch()}
          skeleton="LOADING LANDSCAPE…"
        >
          {(rows) => <Generalization3D rows={rows} mode={mode} />}
        </QueryState>
        <NoteStrip tone="neutral" className="mt-3">
          Train/test IC landscape from results/horizon_analysis.csv — one bar
          per published (feature, horizon) observation. Point-level event data
          is not published, so session point clouds are intentionally not
          shown; this scene uses only supported research results.
        </NoteStrip>
      </PanelShell>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Session card                                                        */
/* ------------------------------------------------------------------ */

function GenSessionCard({ session, train }: { session: ResearchSession; train: boolean }) {
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
      className={cn(
        "rounded-md border p-3",
        train ? "border-hairline bg-panel/60" : "border-accent/30 bg-accent-soft/40",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-ink">
          {session.label}
        </h3>
        <span
          className={cn(
            "rounded border px-1.5 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.14em]",
            train ? "border-ink/20 bg-white text-body" : "border-accent/40 bg-white text-accent-deep",
          )}
        >
          {session.role}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCell label="Valid L2 States" value={fmt.int(session.valid_l2_states)} />
        <StatCell label="Mean Rel. Spread" value={`~${fmt.dec(session.mean_relative_spread_bps, 1)}`} unit="bps" />
        <StatCell label="L1 IC @ 10 ev" value={fmt.dec(session.l1_ic_at_10_events, 3)} />
        <StatCell label="Time Span" value={`~${fmt.dec(session.time_span_hours, 2)}`} unit="h" />
      </div>
      <figure className="mt-3 border border-hairline bg-white p-2">
        <figcaption className="flex items-baseline justify-between font-mono text-[8.5px] uppercase tracking-[0.16em] text-faint">
          <span>L1 IC vs horizon</span>
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

/* ------------------------------------------------------------------ */
/* Shift dot plot — mean ± std per feature, both sessions             */
/* ------------------------------------------------------------------ */

function ShiftPlot({ rows }: { rows: { feature: string; s1_mean: number | null; s2_mean: number | null; s1_std: number | null; s2_std: number | null }[] }) {
  const w = 300;
  const rowH = 34;
  const padL = 8;
  const plotW = w - padL - 8;
  const h = rows.length * rowH + 10;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full"
      role="img"
      aria-label="Feature mean and standard deviation per session: session 1 in navy, session 2 in accent"
    >
      {rows.map((r, i) => {
        const y = 8 + i * rowH + rowH / 2;
        const vals = [r.s1_mean, r.s2_mean, r.s1_std, r.s2_std].filter(
          (v): v is number => v !== null,
        );
        if (vals.length === 0) return null;
        const lo = Math.min(...vals);
        const hi = Math.max(...vals);
        const span = Math.max(1e-9, hi - lo);
        const xOf = (v: number) => padL + ((v - lo) / span) * (plotW - 40) + 20;
        const line = (mean: number | null, std: number | null, color: string, dy: number) => {
          if (mean === null) return null;
          const x = xOf(mean);
          const s = std ?? 0;
          const x0 = xOf(mean - s);
          const x1 = xOf(mean + s);
          return (
            <g key={`${r.feature}-${color}`}>
              <line x1={x0} y1={y + dy - 6} x2={x0} y2={y + dy + 6} stroke={color} strokeWidth="1" opacity="0.5" />
              <line x1={x1} y1={y + dy - 6} x2={x1} y2={y + dy + 6} stroke={color} strokeWidth="1" opacity="0.5" />
              <line x1={x0} y1={y + dy} x2={x1} y2={y + dy} stroke={color} strokeWidth="1" opacity="0.5" />
              <circle cx={x} cy={y + dy} r="3.2" fill={color} />
            </g>
          );
        };
        return (
          <g key={r.feature}>
            <text
              x={padL}
              y={y - 10}
              fontFamily="var(--font-geist-mono), monospace"
              fontSize="7.5"
              fill="#64748b"
              letterSpacing="0.8"
            >
              {FEATURE_LABELS[r.feature] ?? r.feature}
            </text>
            <line x1={padL} y1={y} x2={w - 8} y2={y} stroke="#eef1f6" strokeWidth="1" />
            {line(r.s1_mean, r.s1_std, "#16294d", -4)}
            {line(r.s2_mean, r.s2_std, "#1d5be6", 4)}
          </g>
        );
      })}
      <g>
        <circle cx={padL + 4} cy={h - 2} r="3" fill="#16294d" />
        <text x={padL + 10} y={h} fontFamily="var(--font-geist-mono), monospace" fontSize="7.5" fill="#64748b">
          S01 MEAN ± STD
        </text>
        <circle cx={padL + 96} cy={h - 2} r="3" fill="#1d5be6" />
        <text x={padL + 102} y={h} fontFamily="var(--font-geist-mono), monospace" fontSize="7.5" fill="#64748b">
          S02 MEAN ± STD
        </text>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Train vs test chart with 95% CIs                                    */
/* ------------------------------------------------------------------ */

function TrainTestChart({ rows, featureLabel }: { rows: CrossSessionRow[]; featureLabel: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setW(Math.max(300, e.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 240;
  const PAD = { top: 14, right: 12, bottom: 26, left: 42 };
  const n = rows.length;

  const { yMin, yMax } = useMemo(() => {
    const vals: number[] = [0];
    for (const r of rows) {
      vals.push(r.train_spearman ?? 0, r.test_spearman ?? 0);
      if (r.train_ci_low !== null) vals.push(r.train_ci_low);
      if (r.train_ci_high !== null) vals.push(r.train_ci_high);
      if (r.test_ci_low !== null) vals.push(r.test_ci_low);
      if (r.test_ci_high !== null) vals.push(r.test_ci_high);
    }
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = Math.max(0.02, (hi - lo) * 0.12);
    return { yMin: lo - pad, yMax: hi + pad };
  }, [rows]);

  const xAt = useCallback(
    (i: number) => PAD.left + (i / Math.max(1, n - 1)) * (w - PAD.left - PAD.right),
    [n, w],
  );
  const yAt = useCallback(
    (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.top - PAD.bottom),
    [yMin, yMax],
  );

  const line = useCallback(
    (get: (r: CrossSessionRow) => number | null) =>
      rows
        .map((r, i) => {
          const v = get(r);
          if (v === null) return "";
          return `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`;
        })
        .filter(Boolean)
        .join(" "),
    [rows, xAt, yAt],
  );

  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = (yMax - yMin) / 4;
    for (let i = 0; i <= 4; i++) ticks.push(yMin + step * i);
    return ticks;
  }, [yMin, yMax]);

  const errorBar = (r: CrossSessionRow, i: number, color: string, which: "train" | "test") => {
    const v = which === "train" ? r.train_spearman : r.test_spearman;
    const lo = which === "train" ? r.train_ci_low : r.test_ci_low;
    const hi = which === "train" ? r.train_ci_high : r.test_ci_high;
    if (v === null || lo === null || hi === null) return null;
    const x = xAt(i);
    return (
      <g>
        <line x1={x} y1={yAt(lo)} x2={x} y2={yAt(hi)} stroke={color} strokeWidth="1.1" opacity="0.75" />
        <line x1={x - 3} y1={yAt(lo)} x2={x + 3} y2={yAt(lo)} stroke={color} strokeWidth="1.1" opacity="0.75" />
        <line x1={x - 3} y1={yAt(hi)} x2={x + 3} y2={yAt(hi)} stroke={color} strokeWidth="1.1" opacity="0.75" />
      </g>
    );
  };

  const hovered = hoverIdx !== null ? rows[hoverIdx] : null;

  return (
    <div ref={wrapRef} className="w-full">
      <div className="mb-2 flex flex-wrap items-center gap-4 font-mono text-[9.5px] text-body">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2 w-4 rounded-[1px] bg-[#16294d]" />
          TRAIN · SESSION 01
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2 w-4 rounded-[1px] bg-[#1d5be6]" />
          TEST · SESSION 02 (UNSEEN)
        </span>
        <span className="ml-auto text-faint">{featureLabel.toUpperCase()}</span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${H}`}
        width="100%"
        height={H}
        role="img"
        aria-label={`Train versus test Spearman IC with confidence intervals across horizons for ${featureLabel}`}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * w;
          const rel = (x - PAD.left) / Math.max(1, w - PAD.left - PAD.right);
          const idx = Math.round(rel * (n - 1));
          setHoverIdx(Math.max(0, Math.min(n - 1, idx)));
        }}
        onPointerLeave={() => setHoverIdx(null)}
      >
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              y1={yAt(t)}
              x2={w - PAD.right}
              y2={yAt(t)}
              stroke={Math.abs(t) < 1e-9 ? "#c2cfe0" : "#eef1f6"}
            />
            <text
              x={PAD.left - 6}
              y={yAt(t) + 3}
              textAnchor="end"
              fontFamily="var(--font-geist-mono), monospace"
              fontSize="8.5"
              fill="#64748b"
            >
              {t.toFixed(2)}
            </text>
          </g>
        ))}
        {rows.map((r, i) => (
          <text
            key={r.horizon}
            x={xAt(i)}
            y={H - 8}
            textAnchor="middle"
            fontFamily="var(--font-geist-mono), monospace"
            fontSize="8.5"
            fill="#64748b"
          >
            {r.horizon}
          </text>
        ))}
        <text
          x={w - PAD.right}
          y={H - 8}
          textAnchor="end"
          fontFamily="var(--font-geist-mono), monospace"
          fontSize="8"
          fill="#93a7c2"
          letterSpacing="1.2"
        >
          EVENTS
        </text>

        {rows.map((r, i) => (
          <g key={`eb-${r.horizon}`}>
            {errorBar(r, i, "#16294d", "train")}
            {errorBar(r, i, "#1d5be6", "test")}
          </g>
        ))}
        <path d={line((r) => r.train_spearman)} fill="none" stroke="#16294d" strokeWidth="1.8" />
        <path d={line((r) => r.test_spearman)} fill="none" stroke="#1d5be6" strokeWidth="1.8" />
        {rows.map((r, i) => (
          <g key={`pt-${r.horizon}`}>
            {r.train_spearman !== null ? (
              <circle cx={xAt(i)} cy={yAt(r.train_spearman)} r="2.8" fill="#16294d" />
            ) : null}
            {r.test_spearman !== null ? (
              <circle cx={xAt(i)} cy={yAt(r.test_spearman)} r="2.8" fill="#1d5be6" />
            ) : null}
          </g>
        ))}

        {hovered ? (
          <line
            x1={xAt(hoverIdx ?? 0)}
            y1={PAD.top}
            x2={xAt(hoverIdx ?? 0)}
            y2={H - PAD.bottom}
            stroke="#0a1b33"
            strokeWidth="0.8"
            opacity="0.35"
          />
        ) : null}
      </svg>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[9.5px] tabular-nums text-body">
        <span className="uppercase tracking-[0.14em] text-faint">
          {hovered ? `H = ${hovered.horizon} EVENTS` : "HOVER FOR READOUT"}
        </span>
        {hovered ? (
          <>
            <span>
              TRAIN {fmt.dec(hovered.train_spearman, 4)}{" "}
              <span className="text-faint">
                [{fmt.dec(hovered.train_ci_low, 3)}, {fmt.dec(hovered.train_ci_high, 3)}]
              </span>
            </span>
            <span>
              TEST {fmt.dec(hovered.test_spearman, 4)}{" "}
              <span className="text-faint">
                [{fmt.dec(hovered.test_ci_low, 3)}, {fmt.dec(hovered.test_ci_high, 3)}]
              </span>
            </span>
            <span className="text-faint">n = {fmt.int(hovered.train_n)} / {fmt.int(hovered.test_n)}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
