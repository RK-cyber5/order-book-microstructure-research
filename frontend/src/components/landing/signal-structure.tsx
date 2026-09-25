"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { SectionHeader } from "./section-header";
import { Reveal } from "./reveal";
import { ApiErrorPanel } from "./api-error-panel";
import { useSignalDecay } from "@/hooks/use-research-data";
import { FEATURE_COLORS } from "./site-constants";
import { cn } from "@/lib/utils";

type SessionKey = "session_1" | "session_2";

const FEATURE_KEYS = ["l1_imb", "l5_imb_1k", "microprice_dev", "ofi"] as const;
type FeatureKey = (typeof FEATURE_KEYS)[number];

const FALLBACK_LABELS: Record<FeatureKey, string> = {
  l1_imb: "L1 Imbalance",
  l5_imb_1k: "L5 Imbalance (1/k)",
  microprice_dev: "Microprice Deviation",
  ofi: "OFI",
};

const HORIZONS = [1, 2, 5, 10, 20, 50, 100, 250, 500];
const Y_MIN = -0.08;
const Y_MAX = 0.62;
const Y_TICKS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6];

const L1_AT_10: Record<SessionKey, { value: number; label: string }> = {
  session_1: { value: 0.361, label: "L1 IC · 0.361" },
  session_2: { value: 0.143, label: "L1 IC · 0.143" },
};

interface Series {
  key: FeatureKey;
  label: string;
  color: string;
  points: { h: number; ic: number }[];
}

export function SignalStructure() {
  const reduce = useReducedMotion();
  const { data, isLoading, isError, refetch } = useSignalDecay();
  const [session, setSession] = useState<SessionKey>("session_2");
  const [hidden, setHidden] = useState<Set<FeatureKey>>(new Set());
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(Math.max(320, entry.contentRect.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const series: Series[] = useMemo(
    () =>
      FEATURE_KEYS.map((key) => {
        const feature = data?.features.find((f) => f.key === key);
        return {
          key,
          label: feature?.label ?? FALLBACK_LABELS[key],
          color: FEATURE_COLORS[key],
          points: (feature?.[session] ?? []).map((p) => ({ h: p.horizon, ic: p.ic })),
        };
      }),
    [data, session],
  );

  const compact = width < 560;
  const height = compact ? 300 : 336;
  const padL = compact ? 40 : 52;
  const padR = 16;
  const padT = 22;
  const padB = compact ? 36 : 42;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const xOf = (h: number) => padL + (Math.log10(h) / Math.log10(500)) * plotW;
  const yOf = (v: number) => padT + ((Y_MAX - v) / (Y_MAX - Y_MIN)) * plotH;

  const onPlotPointerMove = (e: React.PointerEvent<SVGGElement>) => {
    const rect = (e.currentTarget as SVGGElement).getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = 0;
    let bestDist = Infinity;
    HORIZONS.forEach((h, i) => {
      const d = Math.abs(xOf(h) - px);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setHoverIdx(best);
  };

  const toggleFeature = (key: FeatureKey) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const visibleSeries = series.filter((s) => !hidden.has(s.key));
  const annotation = L1_AT_10[session];

  return (
    <section id="signals" aria-labelledby="signals-heading" className="border-t border-hairline bg-white py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          index="03"
          eyebrow="Signal Structure"
          title="Signal Strength vs Prediction Horizon"
          lede="The study evaluates whether order-book information carries short-horizon information about future price movement — and whether that relationship persists outside the training session. Information coefficients are shown per feature across all nine event-time horizons."
        />

        <Reveal delay={0.1} className="mt-10">
          <div className="overflow-hidden rounded-xl border border-hairline bg-white shadow-[0_20px_50px_-38px_rgba(10,27,51,0.35)]">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-panel/70 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <span className="hidden font-mono text-[9.5px] font-medium uppercase tracking-[0.2em] text-faint sm:inline">
                  Session
                </span>
                <div className="inline-flex rounded-md border border-hairline bg-white p-0.5" role="group" aria-label="Select trading session">
                  {(
                    [
                      { key: "session_1", label: "Session 01 · Train" },
                      { key: "session_2", label: "Session 02 · Unseen" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSession(opt.key)}
                      aria-pressed={session === opt.key}
                      className={cn(
                        "rounded-[5px] px-2.5 py-1.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] transition-colors sm:px-3",
                        session === opt.key
                          ? "bg-ink text-white"
                          : "text-faint hover:bg-panel hover:text-ink",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Toggle features">
                {series.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => toggleFeature(s.key)}
                    aria-pressed={!hidden.has(s.key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 font-mono text-[9.5px] font-medium uppercase tracking-[0.08em] transition-all",
                      hidden.has(s.key)
                        ? "border-hairline text-faint/60 opacity-55"
                        : "border-hairline text-ink",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="h-[7px] w-[7px] rounded-full"
                      style={{ backgroundColor: s.color, opacity: hidden.has(s.key) ? 0.4 : 1 }}
                    />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div ref={wrapRef} className="relative px-2 pb-2 pt-2 sm:px-3">
              {isError ? (
                <div className="flex h-[300px] items-center justify-center px-4 sm:h-[336px]">
                  <ApiErrorPanel
                    className="w-full max-w-xl"
                    message="The signal-decay research output (results/session_results.csv) could not be loaded from the research API. The chart is intentionally left empty rather than showing fabricated curves."
                    onRetry={() => void refetch()}
                  />
                </div>
              ) : isLoading ? (
                <div className="flex h-[300px] items-center justify-center sm:h-[336px]">
                  <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                    Loading research output
                  </div>
                </div>
              ) : (
                <svg
                  width={width}
                  height={height}
                  viewBox={`0 0 ${width} ${height}`}
                  className="block max-w-full select-none"
                  role="img"
                  aria-label={`Spearman information coefficient versus prediction horizon for four microstructure signals, ${session === "session_1" ? "Session 1 training data" : "Session 2 unseen data"}`}
                >
                  {/* Y grid */}
                  {Y_TICKS.map((t) => (
                    <g key={t}>
                      <line
                        x1={padL}
                        x2={width - padR}
                        y1={yOf(t)}
                        y2={yOf(t)}
                        stroke={t === 0 ? "#c7d1de" : "#edf0f5"}
                        strokeWidth={t === 0 ? 1 : 1}
                      />
                      <text
                        x={padL - 8}
                        y={yOf(t) + 3}
                        textAnchor="end"
                        fontFamily="var(--font-geist-mono), monospace"
                        fontSize="9.5"
                        fill="#8a97ab"
                      >
                        {t.toFixed(1)}
                      </text>
                    </g>
                  ))}

                  {/* X ticks */}
                  {HORIZONS.map((h) => (
                    <g key={h}>
                      <line x1={xOf(h)} x2={xOf(h)} y1={padT + plotH} y2={padT + plotH + 4} stroke="#c7d1de" />
                      <text
                        x={xOf(h)}
                        y={padT + plotH + 17}
                        textAnchor="middle"
                        fontFamily="var(--font-geist-mono), monospace"
                        fontSize="9.5"
                        fill="#8a97ab"
                      >
                        {h}
                      </text>
                    </g>
                  ))}

                  <text
                    x={width - padR}
                    y={height - 6}
                    textAnchor="end"
                    fontFamily="var(--font-geist-mono), monospace"
                    fontSize="9"
                    letterSpacing="1.4"
                    fill="#8a97ab"
                  >
                    PREDICTION HORIZON · EVENTS (LOG)
                  </text>
                  <text
                    x={padL}
                    y={padT - 9}
                    fontFamily="var(--font-geist-mono), monospace"
                    fontSize="9"
                    letterSpacing="1.4"
                    fill="#8a97ab"
                  >
                    SPEARMAN IC
                  </text>

                  {/* Lines */}
                  <g key={session}>
                    {visibleSeries.map((s, si) => {
                      if (s.points.length === 0) return null;
                      const d = s.points.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.h).toFixed(1)},${yOf(p.ic).toFixed(1)}`).join(" ");
                      return (
                        <g key={s.key}>
                          <motion.path
                            d={d}
                            fill="none"
                            stroke={s.color}
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={reduce ? undefined : { pathLength: 0 }}
                            animate={reduce ? undefined : { pathLength: 1 }}
                            transition={{ duration: 1.05, delay: 0.12 + si * 0.12, ease: [0.33, 0.62, 0.28, 1] }}
                          />
                          {s.points.map((p, i) => (
                            <motion.circle
                              key={i}
                              cx={xOf(p.h)}
                              cy={yOf(p.ic)}
                              r={hoverIdx === i ? 4.2 : 2.6}
                              fill={hoverIdx === i ? s.color : "#ffffff"}
                              stroke={s.color}
                              strokeWidth={1.6}
                              initial={reduce ? undefined : { opacity: 0 }}
                              animate={reduce ? undefined : { opacity: 1 }}
                              transition={{ duration: 0.3, delay: 0.55 + si * 0.12 + i * 0.03 }}
                              style={{ transition: "r 120ms ease, fill 120ms ease" }}
                            />
                          ))}
                        </g>
                      );
                    })}

                    {/* L1 @ 10-event annotation */}
                    {series
                      .filter((s) => s.key === "l1_imb" && !hidden.has(s.key))
                      .map((s) => {
                        const pt = s.points.find((p) => p.h === 10);
                        if (!pt) return null;
                        return (
                          <g key="annotation">
                            <circle cx={xOf(10)} cy={yOf(pt.ic)} r={8.5} fill="none" stroke="#1d5be6" strokeWidth={1} opacity={0.5} strokeDasharray="3 3" />
                            <text
                              x={xOf(10) + 12}
                              y={yOf(pt.ic) - 8}
                              fontFamily="var(--font-geist-mono), monospace"
                              fontSize="9.5"
                              fill="#1d5be6"
                            >
                              {annotation.label}
                            </text>
                          </g>
                        );
                      })}
                  </g>

                  {/* Crosshair */}
                  {hoverIdx !== null ? (
                    <line
                      x1={xOf(HORIZONS[hoverIdx])}
                      x2={xOf(HORIZONS[hoverIdx])}
                      y1={padT}
                      y2={padT + plotH}
                      stroke="#b6c2d3"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      pointerEvents="none"
                    />
                  ) : null}

                  {/* Hover capture */}
                  <g
                    onPointerMove={onPlotPointerMove}
                    onPointerLeave={() => setHoverIdx(null)}
                    style={{ cursor: "crosshair" }}
                  >
                    <rect x={padL} y={padT} width={plotW} height={plotH} fill="transparent" />
                  </g>
                </svg>
              )}

              {/* Tooltip */}
              {hoverIdx !== null && !isLoading && visibleSeries.length > 0 ? (
                <div
                  className="pointer-events-none absolute top-3 z-10 min-w-[168px] rounded-md border border-hairline bg-white/95 px-3 py-2 shadow-md backdrop-blur-sm"
                  style={{
                    left: Math.min(Math.max(xOf(HORIZONS[hoverIdx]) + 14, 8), width - 190),
                  }}
                >
                  <p className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-faint">
                    Horizon · {HORIZONS[hoverIdx]} events
                  </p>
                  <div className="mt-1.5 space-y-1">
                    {visibleSeries.map((s) => {
                      const pt = s.points.find((p) => p.h === HORIZONS[hoverIdx]);
                      if (!pt) return null;
                      return (
                        <p key={s.key} className="flex items-center justify-between gap-4 font-mono text-[10px] leading-none">
                          <span className="flex items-center gap-1.5 text-body">
                            <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: s.color }} />
                            {s.label}
                          </span>
                          <span className="tabular-nums font-semibold text-ink">{pt.ic.toFixed(3)}</span>
                        </p>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer notes */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline bg-panel/50 px-4 py-3 sm:px-5">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
                Source · results/session_results.csv — served read-only via research API
              </p>
              <span className="inline-flex items-center gap-1.5 rounded border border-hairline bg-white px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-body">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-bid/80" />
                Research output
              </span>
            </div>
          </div>

          <p className="mt-4 max-w-3xl text-xs leading-relaxed text-faint">
            {data?.note ??
              "Spearman information coefficient (IC) between microstructure signals and forward mid-price returns, by prediction horizon in event time."}{" "}
            Session 2 is fully unseen: every threshold, parameter and significance decision was
            frozen on Session 1 before evaluation.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
