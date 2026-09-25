"use client";

/**
 * IC vs horizon chart (SVG, measured width) — real published Spearman IC
 * curves from the signal-decay endpoint. Series: Session 01 (navy) and
 * Session 02 (accent) for the selected feature; the currently selected lab
 * horizon is marked with a cursor. No fabricated values.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DecayPoint } from "@/lib/research";
import { fmt } from "./primitives";

interface IcHorizonChartProps {
  s1: DecayPoint[];
  s2: DecayPoint[];
  showS1: boolean;
  showS2: boolean;
  selectedHorizon: number | null;
  featureLabel: string;
}

const H = 220;
const PAD = { top: 14, right: 12, bottom: 24, left: 40 };

export function IcHorizonChart({
  s1,
  s2,
  showS1,
  showS2,
  selectedHorizon,
  featureLabel,
}: IcHorizonChartProps) {
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

  const points = s1.length > 0 ? s1 : s2;
  const n = points.length;

  const { yMin, yMax } = useMemo(() => {
    const vals: number[] = [0];
    if (showS1) for (const p of s1) vals.push(p.ic);
    if (showS2) for (const p of s2) vals.push(p.ic);
    let lo = Math.min(...vals);
    let hi = Math.max(...vals);
    if (hi === lo) {
      hi += 0.05;
      lo -= 0.05;
    }
    const pad = (hi - lo) * 0.12;
    return { yMin: lo - pad, yMax: hi + pad };
  }, [s1, s2, showS1, showS2]);

  const xAt = useCallback(
    (i: number) => PAD.left + (i / Math.max(1, n - 1)) * (w - PAD.left - PAD.right),
    [n, w],
  );
  const yAt = useCallback(
    (v: number) =>
      PAD.top + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.top - PAD.bottom),
    [yMin, yMax],
  );

  const line = useCallback(
    (pts: DecayPoint[]) =>
      pts
        .map(
          (p, i) =>
            `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(p.ic).toFixed(1)}`,
        )
        .join(" "),
    [xAt, yAt],
  );

  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = (yMax - yMin) / 4;
    for (let i = 0; i <= 4; i++) ticks.push(yMin + step * i);
    return ticks;
  }, [yMin, yMax]);

  const hoveredPoint = hoverIdx !== null ? points[hoverIdx] : null;

  return (
    <div ref={wrapRef} className="w-full">
      <svg
        viewBox={`0 0 ${w} ${H}`}
        width="100%"
        height={H}
        role="img"
        aria-label={`Spearman IC versus prediction horizon for ${featureLabel}, sessions 1 and 2, published research output`}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * w;
          const rel = (x - PAD.left) / Math.max(1, w - PAD.left - PAD.right);
          const idx = Math.round(rel * (n - 1));
          setHoverIdx(Math.max(0, Math.min(n - 1, idx)));
        }}
        onPointerLeave={() => setHoverIdx(null)}
      >
        {/* gridlines + y labels */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              y1={yAt(t)}
              x2={w - PAD.right}
              y2={yAt(t)}
              stroke={Math.abs(t) < 1e-9 ? "#c2cfe0" : "#eef1f6"}
              strokeWidth={Math.abs(t) < 1e-9 ? 1 : 1}
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
        {/* x labels */}
        {points.map((p, i) => (
          <text
            key={p.horizon}
            x={xAt(i)}
            y={H - 8}
            textAnchor="middle"
            fontFamily="var(--font-geist-mono), monospace"
            fontSize="8.5"
            fill="#64748b"
          >
            {p.horizon}
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

        {/* selected horizon cursor */}
        {selectedHorizon !== null
          ? points.map((p, i) =>
              p.horizon === selectedHorizon ? (
                <line
                  key={`c-${p.horizon}`}
                  x1={xAt(i)}
                  y1={PAD.top - 4}
                  x2={xAt(i)}
                  y2={H - PAD.bottom}
                  stroke="#1d5be6"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  opacity="0.55"
                />
              ) : null,
            )
          : null}

        {/* series */}
        {showS1 && s1.length > 0 ? (
          <>
            <path d={line(s1)} fill="none" stroke="#16294d" strokeWidth="1.8" />
            {s1.map((p, i) => (
              <circle key={`s1-${p.horizon}`} cx={xAt(i)} cy={yAt(p.ic)} r="2.6" fill="#16294d" />
            ))}
          </>
        ) : null}
        {showS2 && s2.length > 0 ? (
          <>
            <path d={line(s2)} fill="none" stroke="#1d5be6" strokeWidth="1.8" />
            {s2.map((p, i) => (
              <circle key={`s2-${p.horizon}`} cx={xAt(i)} cy={yAt(p.ic)} r="2.6" fill="#1d5be6" />
            ))}
          </>
        ) : null}

        {/* hover readout */}
        {hoveredPoint ? (
          <g>
            <line
              x1={xAt(hoverIdx ?? 0)}
              y1={PAD.top}
              x2={xAt(hoverIdx ?? 0)}
              y2={H - PAD.bottom}
              stroke="#0a1b33"
              strokeWidth="0.8"
              opacity="0.35"
            />
            <circle
              cx={xAt(hoverIdx ?? 0)}
              cy={yAt(hoveredPoint.ic)}
              r="3.4"
              fill="none"
              stroke="#0a1b33"
              strokeWidth="1.2"
            />
          </g>
        ) : null}
      </svg>

      {/* hover caption (below the chart, dense mono) */}
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[9.5px] text-body">
        <span className="uppercase tracking-[0.14em] text-faint">
          {hoveredPoint
            ? `H = ${hoveredPoint.horizon} EVENTS`
            : "HOVER FOR READOUT"}
        </span>
        {hoveredPoint ? (
          <>
            {showS1 ? (
              <span className="tabular-nums">
                <span className="mr-1 inline-block h-2 w-2 rounded-[1px] bg-[#16294d]" />
                S01 IC {fmt.dec(s1[hoverIdx ?? 0]?.ic ?? null, 4)}
              </span>
            ) : null}
            {showS2 ? (
              <span className="tabular-nums">
                <span className="mr-1 inline-block h-2 w-2 rounded-[1px] bg-[#1d5be6]" />
                S02 IC {fmt.dec(s2[hoverIdx ?? 0]?.ic ?? null, 4)}
              </span>
            ) : null}
            <span className="tabular-nums text-faint">n = {fmt.int(hoveredPoint.n_obs)}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
