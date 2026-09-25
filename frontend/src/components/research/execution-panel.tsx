"use client";

/**
 * EXECUTION LAB — interactive modeled cost & latency analysis.
 *
 * Every number is a published research output served by /api/research/execution
 * (headline) and /api/research/execution-grid (modeled latency × cost grid,
 * computed server-side). The lab is explicitly MODELED EXECUTION — NOT LIVE
 * TRADING. Latency 20 events has no published result and is shown as such
 * (never invented); the execution analysis horizon is the published 10-event
 * evaluation.
 */

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { researchApi } from "@/lib/research";
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
import type { SurfaceCell } from "./execution-surface-3d";

const ExecutionSurface3D = dynamic(
  () => import("./execution-surface-3d").then((m) => m.ExecutionSurface3D),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[340px] items-center justify-center font-mono text-[10px] uppercase tracking-[0.2em] text-faint sm:h-[400px] lg:h-[460px]">
        <span className="mr-3 h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
        LOADING MODELED SURFACE…
      </div>
    ),
  },
);

const SIGNAL_LABELS: Record<string, string> = {
  l1_imb: "L1 Imbalance",
  l5_imb_1k: "L5 Imbalance (1/k)",
  l5_imb_uni: "L5 Imbalance (uniform)",
  microprice_dev: "Microprice Deviation",
  ofi: "OFI",
  rel_spread: "Relative Spread",
};

const LATENCY_OPTIONS = [0, 1, 2, 5, 10, 20]; // 20 = selectable, NOT published
const HORIZONS = [1, 2, 5, 10, 20, 50, 100, 250, 500];
const SESSION_LEVEL = "__session__";

export function ExecutionPanel() {
  const execution = useQuery({
    queryKey: ["research", "execution"],
    queryFn: researchApi.execution,
  });
  const grid = useQuery({
    queryKey: ["research", "execution-grid"],
    queryFn: researchApi.executionGrid,
  });

  /* ------------------------------------------------------ controls ---- */
  const [signal, setSignal] = useState<string>(SESSION_LEVEL);
  const [session, setSession] = useState<1 | 2>(1);
  const [horizon, setHorizon] = useState("10");
  const [execMode, setExecMode] = useState("aggressive");
  const [multiplier, setMultiplier] = useState(1.0);
  const [latency, setLatency] = useState(0);

  const perSignal = signal !== SESSION_LEVEL;
  const latencyPublished = LATENCY_OPTIONS.indexOf(latency) < 5; // 0,1,2,5,10

  /* ------------------------------------------- current grid source -- */
  const source = useMemo(() => {
    if (grid.data === undefined) return null;
    if (!perSignal) {
      const key = session === 1 ? "Session_1" : "Session_2";
      const g = grid.data.sessions[key];
      return {
        latencies: g.latencies_events,
        costMultipliers: g.cost_multipliers,
        gross: g.gross_bps,
        baseCost: g.base_cost_bps,
        netGrid: g.net_bps_grid,
        nTrades: null as number | null,
      };
    }
    const sig = grid.data.per_signal.find((s) => s.signal === signal);
    if (!sig) return null;
    return {
      latencies: sig.latencies_events,
      costMultipliers: sig.cost_multipliers,
      gross: sig.latencies_events.map((l) => sig.gross_bps_by_latency[String(l)] ?? null),
      baseCost: sig.base_cost_bps,
      netGrid: sig.net_bps_grid,
      nTrades: sig.n_trades,
    };
  }, [grid.data, perSignal, session, signal]);

  const latIdx = source ? source.latencies.indexOf(latency) : -1;
  const multIdx = source ? source.costMultipliers.indexOf(multiplier) : -1;

  const cell = useMemo(() => {
    if (!source || latIdx < 0 || multIdx < 0) return null;
    return {
      gross: source.gross[latIdx],
      cost: source.baseCost !== null ? source.baseCost * multiplier : null,
      net: source.netGrid[latIdx]?.[multIdx] ?? null,
    };
  }, [source, latIdx, multIdx, multiplier]);

  const cells: SurfaceCell[] = useMemo(() => {
    if (!source) return [];
    const out: SurfaceCell[] = [];
    for (let i = 0; i < source.latencies.length; i++) {
      for (let j = 0; j < source.costMultipliers.length; j++) {
        out.push({
          latIdx: i,
          multIdx: j,
          latency: source.latencies[i],
          multiplier: source.costMultipliers[j],
          net: source.netGrid[i]?.[j] ?? null,
          gross: source.gross[i] ?? null,
          baseCost: source.baseCost,
        });
      }
    }
    return out;
  }, [source]);

  const zMax = useMemo(
    () => Math.max(0.1, ...cells.map((c) => Math.abs(c.net ?? 0))),
    [cells],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* --------------------------------------------- headline ---- */}
      <PanelShell
        id="exec-headline"
        title="Execution Lab — Modeled Cost & Latency Analysis"
        meta="MODELED EXECUTION · NOT LIVE TRADING"
        badge={<ProvenanceBadge kind="modeled" compact />}
      >
        <QueryState
          isLoading={execution.isLoading}
          error={execution.error}
          data={execution.data}
          onRetry={() => execution.refetch()}
          skeleton="LOADING PUBLISHED EXECUTION RESULT…"
        >
          {(e) => (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                {e.flow.map((step, i) => (
                  <span key={step} className="flex items-center gap-1.5">
                    <span className="rounded-sm border border-hairline bg-panel px-2 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.14em] text-body">
                      {step}
                    </span>
                    {i < e.flow.length - 1 ? (
                      <span aria-hidden="true" className="text-faint">
                        →
                      </span>
                    ) : null}
                  </span>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatCell
                  label="Gross Effect · S01"
                  value={fmt.bps(e.session_1.gross_bps, 3)}
                  unit="bps"
                  hint="Published gross signal effect at zero added latency (report precision)"
                />
                <StatCell
                  label="Modeled Spread Cost"
                  value={fmt.bps(e.session_1.spread_cost_bps, 2)}
                  unit="bps"
                  hint="Aggressive taker: cross the spread on entry and exit"
                />
                <StatCell
                  label="Net Effect · S01"
                  value={fmt.signed(e.session_1.net_bps, 3)}
                  unit="bps"
                  tone={e.session_1.net_bps < 0 ? "ask" : "bid"}
                />
                <StatCell label="Trades Modeled · L1" value={fmt.int(e.cost_by_signal[0]?.n_trades ?? null)} />
              </div>
              <NoteStrip tone="amber" icon="⚠" className="mt-3">
                {e.caveat}
              </NoteStrip>
              <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
                HEADLINE VALUES ARE REPORTED AT REPORT PRECISION (report.md);
                GRID CELLS BELOW DERIVE FROM THE FULL-PRECISION CSVs.
              </p>
            </>
          )}
        </QueryState>
      </PanelShell>

      {/* --------------------------------------------- controls + readout ---- */}
      <PanelShell
        id="exec-lab"
        title="Modeled Net Effect Explorer"
        meta="GROSS / COST / NET · SERVER-COMPUTED GRID"
        badge={<ProvenanceBadge kind="modeled" compact />}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <TerminalSelect
            label="Signal"
            value={signal}
            options={[
              { value: SESSION_LEVEL, label: "Session-Level" },
              ...Object.keys(SIGNAL_LABELS).map((k) => ({
                value: k,
                label: SIGNAL_LABELS[k],
              })),
            ]}
            onChange={setSignal}
            hint="Session-level uses the published session latency curves; per-signal uses the unseen-session cost analysis"
          />
          <div className="flex flex-col gap-1 border border-hairline bg-white px-2 py-1.5">
            <span className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.18em] text-faint">
              Session
            </span>
            <div className="flex gap-1.5 pb-0.5">
              <ChipToggle
                label="S01"
                pressed={!perSignal && session === 1}
                onClick={() => setSession(1)}
                disabled={perSignal}
                title={perSignal ? "Per-signal results are from the unseen session" : "Session 01 latency curve"}
                className="h-6"
              />
              <ChipToggle
                label="S02"
                pressed={!perSignal && session === 2}
                onClick={() => setSession(2)}
                disabled={perSignal}
                title={perSignal ? "Per-signal results are from the unseen session" : "Session 02 latency curve"}
                className="h-6"
              />
            </div>
          </div>
          <TerminalSelect
            label="Horizon"
            value={horizon}
            options={HORIZONS.map((h) => ({
              value: String(h),
              label: h === 10 ? `${h} (published)` : `${h} — not published`,
              disabled: h !== 10,
            }))}
            onChange={setHorizon}
            hint="Execution analysis was performed at the 10-event horizon"
          />
          <TerminalSelect
            label="Execution Mode"
            value={execMode}
            options={[
              { value: "aggressive", label: "Aggressive Taker · Cross Spread" },
              {
                value: "passive",
                label: "Passive — Not Evaluated",
                disabled: true,
              },
            ]}
            onChange={setExecMode}
            hint="Passive execution was not evaluated in the study"
          />
          <div className="flex flex-col gap-1 border border-hairline bg-white px-2 py-1.5">
            <span className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.18em] text-faint">
              Spread Multiplier
            </span>
            <div className="flex gap-1.5 pb-0.5">
              {(source?.costMultipliers ?? [0.5, 1.0, 2.0]).map((m) => (
                <ChipToggle
                  key={m}
                  label={`${m.toFixed(1)}×`}
                  pressed={multiplier === m}
                  onClick={() => setMultiplier(m)}
                  title={`Modeled cost multiplier ${m}× (published sensitivity row)`}
                  className="h-6"
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1 border border-hairline bg-white px-2 py-1.5">
            <span className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.18em] text-faint">
              Latency · Events
            </span>
            <div className="no-scrollbar flex gap-1 overflow-x-auto pb-0.5">
              {LATENCY_OPTIONS.map((l) => (
                <ChipToggle
                  key={l}
                  label={String(l)}
                  pressed={latency === l}
                  onClick={() => setLatency(l)}
                  title={
                    l === 20
                      ? "No published result at 20-event latency — selecting shows the not-published state"
                      : `Added latency of ${l} events (published)`
                  }
                  className="h-6"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Readout */}
        <div className="mt-3">
          {!latencyPublished ? (
            <p className="border border-amber-400/50 bg-amber-50/70 px-3 py-3 font-mono text-[10px] leading-relaxed text-amber-900">
              NOT PUBLISHED — the execution analysis was run at latencies 0 / 1
              / 2 / 5 / 10 events; there is no published result at a 20-event
              delay. Values are never invented.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatCell
                label="Gross Effect"
                value={cell ? fmt.bps(cell.gross, 4) : "—"}
                unit="bps"
                hint="Published gross effect at the selected latency"
              />
              <StatCell
                label="Execution Cost"
                value={cell && cell.cost !== null ? fmt.bps(cell.cost, 2) : "—"}
                unit="bps"
                hint="Multiplier × base spread cost (published linear cost model)"
              />
              <StatCell
                label="Net Effect"
                value={cell ? fmt.signed(cell.net, 4) : "—"}
                unit="bps"
                tone={cell && cell.net !== null && cell.net < 0 ? "ask" : "bid"}
                hint="Server-computed modeled net at the selected (latency, multiplier)"
              />
              <StatCell
                label={perSignal ? "Trades · Signal" : "Base Cost ×1.0"}
                value={
                  perSignal
                    ? fmt.int(source?.nTrades ?? null)
                    : fmt.bps(source?.baseCost ?? null, 2)
                }
                unit={perSignal ? undefined : "bps"}
                hint={
                  perSignal
                    ? "Number of modeled trades for this signal (cost_analysis.csv)"
                    : "Base spread cost at multiplier 1.0 for the selected session"
                }
              />
            </div>
          )}
        </div>

        <NoteStrip tone="neutral" className="mt-3">
          {perSignal
            ? "PER-SIGNAL RESULTS · UNSEEN SESSION (results/cost_analysis.csv); base cost 38.78 bps at ×1.0."
            : "SESSION-LEVEL GRID · gross from results/session_latency.csv; base cost from results/session_cost_sensitivity.csv."}{" "}
          Net = gross(latency) − multiplier × base cost — computed server-side,
          never in the browser.
        </NoteStrip>
      </PanelShell>

      {/* --------------------------------------------- 3D surface ---- */}
      <PanelShell
        id="exec-surface"
        title="Modeled Net-Effect Surface"
        meta="X = LATENCY · Y = SPREAD/COST ASSUMPTION · Z = MODELED NET"
        badge={<ProvenanceBadge kind="modeled" compact />}
      >
        <QueryState
          isLoading={grid.isLoading}
          error={grid.error}
          data={source ?? undefined}
          onRetry={() => grid.refetch()}
          skeleton="LOADING MODELED GRID…"
        >
          {(src) =>
            latencyPublished ? (
              <ExecutionSurface3D
                cells={cells}
                latencies={src.latencies}
                multipliers={src.costMultipliers}
                zMax={zMax}
                selected={
                  latIdx >= 0 && multIdx >= 0 ? { latIdx, multIdx } : null
                }
                onSelect={(li, mi) => {
                  setLatency(src.latencies[li]);
                  const m = src.costMultipliers[mi];
                  if (m !== undefined) setMultiplier(m);
                }}
              />
            ) : (
              <p className="border border-amber-400/50 bg-amber-50/70 px-3 py-6 text-center font-mono text-[10px] text-amber-900">
                SURFACE SHOWS PUBLISHED LATENCIES 0 / 1 / 2 / 5 / 10 ONLY —
                SELECT ONE OF THOSE LATENCIES TO VIEW IT
              </p>
            )
          }
        </QueryState>
        <NoteStrip tone="amber" icon="⚠" className="mt-3">
          {grid.data?.provenance ??
            "Research visualization of modeled assumptions — not live trading."}{" "}
          {grid.data?.caveat}
        </NoteStrip>
      </PanelShell>

      {/* --------------------------------------------- latency table ---- */}
      <PanelShell
        id="exec-latency"
        title="Gross Effect vs Added Latency — Session 01"
        meta="RESULTS/SESSION_LATENCY.CSV"
        badge={<ProvenanceBadge kind="research" compact />}
      >
        <QueryState
          isLoading={execution.isLoading}
          error={execution.error}
          data={execution.data}
          onRetry={() => execution.refetch()}
          skeleton="LOADING LATENCY CURVE…"
        >
          {(e) => (
            <div className="max-h-96 overflow-auto border border-hairline bg-white [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-ink/15 [&::-webkit-scrollbar-track]:bg-transparent">
              <table className={cn(tableCls.table, "min-w-[420px]")}>
                <thead>
                  <tr>
                    <th className={tableCls.th}>Latency · Events</th>
                    <th className={cn(tableCls.th, "text-right")}>Gross · bps</th>
                    <th className={cn(tableCls.th, "text-right")}>IC</th>
                  </tr>
                </thead>
                <tbody>
                  {e.latency_curve_session_1.map((r) => {
                    const isSel = !perSignal && session === 1 && r.latency_events === latency;
                    return (
                      <tr
                        key={r.latency_events}
                        className={cn(
                          "cursor-pointer transition-colors",
                          isSel ? "bg-accent-soft/40" : "hover:bg-panel/70",
                        )}
                        onClick={() => setLatency(r.latency_events)}
                        title="Click to select this latency in the explorer above"
                      >
                        <td className={cn(tableCls.td, "font-semibold text-ink")}>
                          +{r.latency_events} ev
                        </td>
                        <td className={tableCls.tdNum}>{fmt.bps(r.gross_bps, 4)}</td>
                        <td className={tableCls.tdNum}>
                          {r.ic === null ? (
                            <span title="IC not published for this delay" className="cursor-help">
                              —<span className="sr-only"> — not published</span>
                            </span>
                          ) : (
                            fmt.dec(r.ic, 4)
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="cursor-pointer transition-colors hover:bg-panel/70" onClick={() => setLatency(20)}>
                    <td className={cn(tableCls.td, "font-semibold text-ink")}>+20 ev</td>
                    <td className={tableCls.tdNum}>
                      <NaCell title="No published result at a 20-event delay" />
                    </td>
                    <td className={tableCls.tdNum}>
                      <NaCell title="No published result at a 20-event delay" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </QueryState>
        <NoteStrip tone="neutral" className="mt-3">
          Each event of delay erodes the tradable gross effect; at the 10-event
          delay it is exactly zero in the published analysis. IC is not
          published for the 10-event delay (—). Rows are clickable and drive
          the explorer above.
        </NoteStrip>
      </PanelShell>

      {/* ------------------------------------------ per-signal table ---- */}
      <PanelShell
        id="exec-signals"
        title="Gross Effect by Signal vs Latency — Unseen Session"
        meta="RESULTS/COST_ANALYSIS.CSV · MODELED"
        badge={<ProvenanceBadge kind="modeled" compact />}
      >
        <QueryState
          isLoading={grid.isLoading}
          error={grid.error}
          data={grid.data}
          onRetry={() => grid.refetch()}
          skeleton="LOADING PER-SIGNAL TABLE…"
        >
          {(g) => (
            <div className="max-h-96 overflow-auto border border-hairline bg-white [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-ink/15 [&::-webkit-scrollbar-track]:bg-transparent">
              <table className={cn(tableCls.table, "min-w-[560px]")}>
                <thead>
                  <tr>
                    <th className={tableCls.th}>Signal</th>
                    <th className={cn(tableCls.th, "text-right")}>N Trades</th>
                    {[0, 1, 2, 5, 10].map((l) => (
                      <th key={l} className={cn(tableCls.th, "text-right")}>
                        Gross @ +{l} ev
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {g.per_signal.map((s) => (
                    <tr
                      key={s.signal}
                      className={cn(
                        "cursor-pointer transition-colors",
                        signal === s.signal ? "bg-accent-soft/40" : "hover:bg-panel/70",
                      )}
                      onClick={() => setSignal(s.signal)}
                      title="Click to load this signal in the explorer above"
                    >
                      <td className={cn(tableCls.td, "font-semibold text-ink")}>
                        {SIGNAL_LABELS[s.signal] ?? s.signal}
                      </td>
                      <td className={tableCls.tdNum}>{fmt.int(s.n_trades)}</td>
                      {[0, 1, 2, 5, 10].map((l) => {
                        const v = s.gross_bps_by_latency[String(l)];
                        return (
                          <td key={l} className={tableCls.tdNum}>
                            {v === null ? (
                              <NaCell title="Not published for this signal/latency" />
                            ) : (
                              <span className={v < 0 ? "text-ask" : "text-ink"}>
                                {fmt.signed(v, 4)}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </QueryState>
        <NoteStrip tone="amber" icon="⚠" className="mt-3">
          {grid.data?.statement ??
            "Gross signal effects were substantially smaller than the modeled spread and latency costs."}{" "}
          Modeled execution only — no live trading, no profitability claim.
        </NoteStrip>
      </PanelShell>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
        <Micro>Source files</Micro>
        <span>{grid.data?.source_files.join(" · ") ?? "results/session_latency.csv · results/session_cost_sensitivity.csv · results/cost_analysis.csv"}</span>
      </div>
    </div>
  );
}
