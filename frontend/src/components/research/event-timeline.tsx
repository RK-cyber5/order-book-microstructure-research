"use client";

/**
 * EVENT-TIME TIMELINE — synchronized metric tracks for the replay lab.
 *
 * Four tracks (mid price, spread bps, L1 imbalance, OFI) share one event-index
 * X axis, rendered from the strided timeline samples served by the research
 * API. The shared cursor follows the selected event; clicking/dragging a track
 * selects the nearest sampled event. Values are RECONSTRUCTED — ILLUSTRATIVE
 * (deterministic reconstruction), never presented as raw exchange data.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReplayTimelinePoint } from "@/lib/research";
import { cn } from "@/lib/utils";
import { ProvenanceBadge, fmt } from "./primitives";

interface EventTimelineProps {
  points: ReplayTimelinePoint[];
  nEvents: number;
  eventIndex: number;
  onSelect: (eventIndex: number) => void;
  className?: string;
}

const TRACK_H = 54;
const TRACK_GAP = 8;
const LABEL_W = 74;
const TOP_PAD = 6;
const BOTTOM_PAD = 16;

interface TrackSpec {
  key: keyof Pick<ReplayTimelinePoint, "mid" | "spread_bps" | "l1_imbalance" | "ofi">;
  label: string;
  color: string;
  refLine: "zero" | "mean" | "none";
  format: (v: number | null | undefined) => string;
}

const TRACKS: TrackSpec[] = [
  {
    key: "mid",
    label: "MID PRICE",
    color: "#16294d",
    refLine: "none",
    format: (v) => fmt.price(v),
  },
  {
    key: "spread_bps",
    label: "SPREAD · BPS",
    color: "#b45309",
    refLine: "mean",
    format: (v) => fmt.dec(v, 2),
  },
  {
    key: "l1_imbalance",
    label: "L1 IMBALANCE",
    color: "#1d5be6",
    refLine: "zero",
    format: (v) => fmt.signed(v, 3),
  },
  {
    key: "ofi",
    label: "OFI",
    color: "#0e9f8e",
    refLine: "mean",
    format: (v) => fmt.signed(v, 3),
  },
];

export function EventTimeline({
  points,
  nEvents,
  eventIndex,
  onSelect,
  className,
}: EventTimelineProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setW(Math.max(280, e.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const plotW = Math.max(60, w - LABEL_W - 8);
  const totalH = TOP_PAD + TRACKS.length * TRACK_H + (TRACKS.length - 1) * TRACK_GAP + BOTTOM_PAD;

  /** Map event index → x pixel. */
  const xAt = useCallback(
    (i: number) => LABEL_W + (i / Math.max(1, nEvents - 1)) * plotW,
    [nEvents, plotW],
  );

  /** Map x pixel → nearest sampled point (returns its true event index). */
  const nearestPointIndex = useCallback(
    (x: number): number | null => {
      if (points.length === 0) return null;
      const rel = (x - LABEL_W) / Math.max(1, plotW);
      const idx = Math.round(rel * (points.length - 1));
      const clamped = Math.max(0, Math.min(points.length - 1, idx));
      return clamped;
    },
    [points.length, plotW],
  );

  const tracks = useMemo(
    () =>
      TRACKS.map((spec) => {
        const vals = points.map((p) => p[spec.key] as number);
        let lo = Math.min(...vals);
        let hi = Math.max(...vals);
        if (hi === lo) {
          hi += Math.abs(hi) * 0.05 + 1e-9;
          lo -= Math.abs(lo) * 0.05 + 1e-9;
        }
        const pad = (hi - lo) * 0.1;
        lo -= pad;
        hi += pad;
        const mean = vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
        const yAt = (v: number) => {
          const top = TOP_PAD + TRACKS.indexOf(spec) * (TRACK_H + TRACK_GAP);
          return top + (1 - (v - lo) / (hi - lo)) * (TRACK_H - 8) + 4;
        };
        const path = points
          .map((p, i) => {
            const x = xAt(p.i);
            const y = yAt(p[spec.key] as number);
            return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(" ");
        return { spec, lo, hi, mean, yAt, path };
      }),
    [points, xAt],
  );

  const hovered = hoverIdx !== null ? points[hoverIdx] : null;
  const cursorIdx = hoverIdx !== null ? hoverIdx : points.findIndex((p) => p.i === eventIndex);

  const handlePointer = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * w;
      const idx = nearestPointIndex(x);
      setHoverIdx(idx);
      return idx;
    },
    [nearestPointIndex, w],
  );

  return (
    <div ref={wrapRef} className={cn("w-full", className)}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
          EVENT-TIME TIMELINE · {points.length} SAMPLED POINTS · CLICK OR DRAG TO SELECT
        </span>
        <ProvenanceBadge kind="reconstructed" compact />
      </div>
      <svg
        viewBox={`0 0 ${w} ${totalH}`}
        width="100%"
        height={totalH}
        role="img"
        aria-label="Event-time timeline of the reconstructed session: mid price, spread in basis points, L1 imbalance and order flow imbalance tracks with a shared event cursor"
        tabIndex={0}
        onPointerMove={(e) => handlePointer(e)}
        onPointerLeave={() => setHoverIdx(null)}
        onPointerDown={(e) => {
          const idx = handlePointer(e);
          if (idx !== null && points[idx]) onSelect(points[idx].i);
        }}
        onKeyDown={(e) => {
          // Keyboard accessibility: arrow keys step the shared event index.
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            const step = e.key === "ArrowLeft" ? -1 : 1;
            const next = Math.max(0, Math.min(nEvents - 1, eventIndex + step));
            onSelect(next);
          }
        }}
      >
        {tracks.map(({ spec, lo, hi, mean, yAt, path }) => {
          const top = TOP_PAD + TRACKS.indexOf(spec) * (TRACK_H + TRACK_GAP);
          const refY = spec.refLine === "zero" ? yAt(0) : spec.refLine === "mean" ? yAt(mean) : null;
          return (
            <g key={spec.key}>
              <rect
                x={LABEL_W}
                y={top}
                width={plotW}
                height={TRACK_H}
                fill="#f7f9fc"
                stroke="#e7ebf2"
                strokeWidth="1"
              />
              <text
                x={LABEL_W - 6}
                y={top + TRACK_H / 2}
                textAnchor="end"
                fontFamily="var(--font-geist-mono), monospace"
                fontSize="8"
                letterSpacing="1"
                fill="#64748b"
              >
                {spec.label}
              </text>
              <text
                x={LABEL_W - 6}
                y={top + 10}
                textAnchor="end"
                fontFamily="var(--font-geist-mono), monospace"
                fontSize="7"
                fill="#93a7c2"
              >
                {spec.format(hi)}
              </text>
              <text
                x={LABEL_W - 6}
                y={top + TRACK_H - 4}
                textAnchor="end"
                fontFamily="var(--font-geist-mono), monospace"
                fontSize="7"
                fill="#93a7c2"
              >
                {spec.format(lo)}
              </text>
              {refY !== null ? (
                <line
                  x1={LABEL_W}
                  y1={refY}
                  x2={LABEL_W + plotW}
                  y2={refY}
                  stroke="#c2cfe0"
                  strokeDasharray="2 3"
                />
              ) : null}
              <path d={path} fill="none" stroke={spec.color} strokeWidth="1.4" />
            </g>
          );
        })}

        {/* Shared cursor. */}
        {cursorIdx >= 0 && points[cursorIdx] ? (
          <line
            x1={xAt(points[cursorIdx].i)}
            y1={TOP_PAD}
            x2={xAt(points[cursorIdx].i)}
            y2={totalH - BOTTOM_PAD}
            stroke="#0a1b33"
            strokeWidth="1"
            opacity="0.6"
          />
        ) : null}

        {/* X axis labels. */}
        <text
          x={LABEL_W}
          y={totalH - 4}
          fontFamily="var(--font-geist-mono), monospace"
          fontSize="8"
          fill="#64748b"
        >
          0
        </text>
        <text
          x={LABEL_W + plotW}
          y={totalH - 4}
          textAnchor="end"
          fontFamily="var(--font-geist-mono), monospace"
          fontSize="8"
          fill="#64748b"
        >
          {nEvents - 1} EV
        </text>
      </svg>

      {/* Readout at the cursor. */}
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[9.5px] tabular-nums text-body">
        <span className="uppercase tracking-[0.14em] text-faint">
          {hovered ? `EVENT ${hovered.i}` : `EVENT ${eventIndex}`}
        </span>
        {TRACKS.map((spec) => (
          <span key={spec.key}>
            <span className="mr-1 inline-block h-2 w-2 rounded-[1px]" style={{ backgroundColor: spec.color }} />
            {spec.label.split(" ")[0]}{" "}
            <span className="font-semibold text-ink">
              {spec.format(hovered ? (hovered[spec.key] as number) : null)}
            </span>
          </span>
        ))}
        <span className="text-faint/70">ARROW KEYS STEP THE EVENT</span>
      </div>
    </div>
  );
}
