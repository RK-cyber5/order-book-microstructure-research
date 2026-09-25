"use client";

/**
 * EXPERIMENT HISTORY — client-side run log for the Signal Lab.
 *
 * Every successful RUN ANALYSIS is appended by the parent panel. This is a
 * UI session log only: no database, no server persistence. The "timestamp" is
 * a run sequence number (wall-clock is deliberately not used in research
 * logic). VIEW loads a record's parameters back into the lab; pinning two
 * records as A/B shows a side-by-side comparison of the published fields.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ExperimentRecord } from "./experiment-client";
import { INFERENCE_LABELS, STATISTIC_LABELS } from "./experiment-client";
import {
  ChipToggle,
  Micro,
  NaCell,
  PanelShell,
  ProvenanceBadge,
  TerminalButton,
  fmt,
  tableCls,
} from "./primitives";
import { CiRange, FdrStatusChip, Num4, type CompareRow } from "./signal-lab-chips";

const SCROLLBAR_CLS =
  "max-h-96 overflow-auto border border-hairline bg-white [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-ink/15 [&::-webkit-scrollbar-thumb:hover]:bg-ink/25 [&::-webkit-scrollbar-track]:bg-transparent";

function sessionLabel(session: number): string {
  return session === 1 ? "01 · TRAIN" : "02 · UNSEEN";
}

export function ExperimentHistory({
  records,
  onLoad,
  onClear,
}: {
  records: ExperimentRecord[];
  onLoad: (record: ExperimentRecord) => void;
  onClear: () => void;
}) {
  const [selA, setSelA] = useState<string | null>(null);
  const [selB, setSelB] = useState<string | null>(null);

  const recA = records.find((r) => r.id === selA) ?? null;
  const recB = records.find((r) => r.id === selB) ?? null;
  const compareRows: CompareRow[] | null =
    recA && recB ? buildCompareRows(recA, recB) : null;

  const toggle = (which: "a" | "b", id: string) => {
    if (which === "a") {
      setSelA((prev) => (prev === id ? null : id));
      setSelB((prev) => (prev === id ? null : prev));
    } else {
      setSelB((prev) => (prev === id ? null : id));
      setSelA((prev) => (prev === id ? null : prev));
    }
  };

  return (
    <PanelShell
      id="experiment-history"
      title="Experiment History"
      meta="CLIENT-SIDE SESSION — NOT PERSISTED"
      badge={<ProvenanceBadge kind="research" compact />}
    >
      {records.length === 0 ? (
        <div className="border border-dashed border-hairline bg-panel px-3 py-5 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
          NO EXPERIMENTS RUN — each successful run above is logged here for this
          browser session
        </div>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Micro>Runs · {records.length}</Micro>
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
              PIN TWO ROWS (A/B) TO COMPARE · VIEW RE-LOADS THE PARAMETERS
            </span>
            <TerminalButton
              variant="ghost"
              onClick={onClear}
              className="ml-auto h-6 px-2"
              title="Clear this session's run log"
            >
              Clear
            </TerminalButton>
          </div>

          <div className={cn(SCROLLBAR_CLS)}>
            <table className={cn(tableCls.table, "min-w-[680px]")}>
              <thead>
                <tr>
                  <th className={cn(tableCls.th, "sticky top-0 z-10")}>ID</th>
                  <th className={cn(tableCls.th, "sticky top-0 z-10")}>Feature</th>
                  <th className={cn(tableCls.th, "sticky top-0 z-10")}>Session</th>
                  <th className={cn(tableCls.th, "sticky top-0 z-10")}>Horizon</th>
                  <th className={cn(tableCls.th, "sticky top-0 z-10")}>Statistic</th>
                  <th className={cn(tableCls.th, "sticky top-0 z-10")}>Inference</th>
                  <th className={cn(tableCls.th, "sticky top-0 z-10 text-right")}>N</th>
                  <th className={cn(tableCls.th, "sticky top-0 z-10 text-right")}>Result</th>
                  <th className={cn(tableCls.th, "sticky top-0 z-10 text-right")}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const pinned =
                    (recA !== null && recA.id === r.id) || (recB !== null && recB.id === r.id);
                  return (
                    <tr
                      key={r.id}
                      className={cn(
                        "transition-colors",
                        pinned ? "bg-accent-soft/40" : "hover:bg-panel/70",
                      )}
                    >
                      <td className={tableCls.td}>
                        <span className="font-semibold text-ink">{r.id}</span>
                        <span className="ml-1.5 text-[8.5px] text-faint">
                          RUN {String(r.run).padStart(3, "0")}
                        </span>
                      </td>
                      <td className={tableCls.td}>{r.featureLabel}</td>
                      <td className={tableCls.td}>{sessionLabel(r.session)}</td>
                      <td className={cn(tableCls.tdNum, "text-left")}>{r.horizon} ev</td>
                      <td className={tableCls.td}>{STATISTIC_LABELS[r.statistic]}</td>
                      <td className={tableCls.td}>{INFERENCE_LABELS[r.inference]}</td>
                      <td className={cn(tableCls.tdNum, "text-left")}>
                        {r.n_obs === null ? <NaCell title="Result not published for this run" /> : fmt.int(r.n_obs)}
                      </td>
                      <td className={tableCls.tdNum}>
                        {r.notPublished ? (
                          <span
                            title="The API answered found=false for this selection — no published result"
                            className="font-semibold text-amber-700"
                          >
                            NOT PUBLISHED
                          </span>
                        ) : r.result === null ? (
                          <NaCell />
                        ) : (
                          fmt.dec(r.result, 4)
                        )}
                      </td>
                      <td className={tableCls.td}>
                        <span className="flex items-center justify-end gap-1">
                          <ChipToggle
                            label="A"
                            pressed={selA === r.id}
                            onClick={() => toggle("a", r.id)}
                            className="h-6 min-w-6 px-1.5"
                            title="Pin as comparison A"
                          />
                          <ChipToggle
                            label="B"
                            pressed={selB === r.id}
                            onClick={() => toggle("b", r.id)}
                            className="h-6 min-w-6 px-1.5"
                            title="Pin as comparison B"
                          />
                          <TerminalButton
                            variant="secondary"
                            onClick={() => onLoad(r)}
                            className="h-6 px-2"
                            title="Load these parameters into the Signal Lab and scroll to the result"
                          >
                            View
                          </TerminalButton>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {compareRows ? (
            <div className="mt-3 overflow-hidden rounded-md border border-hairline bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-panel px-2.5 py-1.5">
                <Micro>Comparison · A vs B</Micro>
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
                  {recA?.id} · RUN {String(recA?.run ?? 0).padStart(3, "0")} vs {recB?.id} · RUN{" "}
                  {String(recB?.run ?? 0).padStart(3, "0")} — differing fields shaded
                </span>
              </div>
              <div className="grid grid-cols-[minmax(88px,auto)_1fr_1fr] font-mono text-[10px]">
                <div className="border-b border-hairline-soft bg-panel px-2 py-1.5 text-left font-semibold uppercase tracking-[0.14em] text-faint">
                  Field
                </div>
                <div className="border-b border-hairline-soft bg-panel px-2 py-1.5 text-left font-semibold uppercase tracking-[0.14em] text-faint">
                  A · {recA?.id}
                </div>
                <div className="border-b border-hairline-soft bg-panel px-2 py-1.5 text-left font-semibold uppercase tracking-[0.14em] text-faint">
                  B · {recB?.id}
                </div>
                {compareRows.map((row) => (
                  <div key={row.label} className="col-span-3 grid grid-cols-subgrid">
                    <div className="border-b border-hairline-soft px-2 py-1.5 text-body">
                      {row.label}
                    </div>
                    <div
                      className={cn(
                        "border-b border-hairline-soft px-2 py-1.5 text-ink",
                        !row.same && "bg-accent-soft/50",
                      )}
                    >
                      {row.a}
                    </div>
                    <div
                      className={cn(
                        "border-b border-hairline-soft px-2 py-1.5 text-ink",
                        !row.same && "bg-accent-soft/50",
                      )}
                    >
                      {row.b}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </PanelShell>
  );
}

/* ------------------------------------------------------------------ */
/* Comparison rows (all values are the published fields of each run)   */
/* ------------------------------------------------------------------ */

function buildCompareRows(a: ExperimentRecord, b: ExperimentRecord): CompareRow[] {
  const numEq = (x: number | null, y: number | null) => x === y;
  return [
    {
      label: "Feature",
      a: a.featureLabel,
      b: b.featureLabel,
      same: a.feature === b.feature,
    },
    { label: "Session", a: sessionLabel(a.session), b: sessionLabel(b.session), same: a.session === b.session },
    { label: "Horizon", a: `${a.horizon} ev`, b: `${b.horizon} ev`, same: a.horizon === b.horizon },
    {
      label: "Statistic",
      a: STATISTIC_LABELS[a.statistic],
      b: STATISTIC_LABELS[b.statistic],
      same: a.statistic === b.statistic,
    },
    {
      label: "Inference",
      a: INFERENCE_LABELS[a.inference],
      b: INFERENCE_LABELS[b.inference],
      same: a.inference === b.inference,
    },
    { label: "n obs", a: fmt.int(a.n_obs), b: fmt.int(b.n_obs), same: a.n_obs === b.n_obs },
    { label: "Spearman IC", a: <Num4 v={a.spearman_ic} />, b: <Num4 v={b.spearman_ic} />, same: numEq(a.spearman_ic, b.spearman_ic) },
    { label: "Pearson IC", a: <Num4 v={a.pearson_ic} />, b: <Num4 v={b.pearson_ic} />, same: numEq(a.pearson_ic, b.pearson_ic) },
    { label: "Directional acc", a: <Num4 v={a.dir_acc} />, b: <Num4 v={b.dir_acc} />, same: numEq(a.dir_acc, b.dir_acc) },
    {
      label: "95% CI",
      a: <CiRange low={a.ic_ci_low} high={a.ic_ci_high} />,
      b: <CiRange low={b.ic_ci_low} high={b.ic_ci_high} />,
      same: numEq(a.ic_ci_low, b.ic_ci_low) && numEq(a.ic_ci_high, b.ic_ci_high),
    },
    {
      label: "HAC t-stat",
      a: a.hac_t_stat === null ? <NaCell /> : fmt.signed(a.hac_t_stat, 4),
      b: b.hac_t_stat === null ? <NaCell /> : fmt.signed(b.hac_t_stat, 4),
      same: numEq(a.hac_t_stat, b.hac_t_stat),
    },
    {
      label: "p-value",
      a: a.p_value === null ? <NaCell /> : fmt.sci(a.p_value),
      b: b.p_value === null ? <NaCell /> : fmt.sci(b.p_value),
      same: numEq(a.p_value, b.p_value),
    },
    {
      label: "FDR",
      a: <FdrStatusChip status={a.fdr_significant} />,
      b: <FdrStatusChip status={b.fdr_significant} />,
      same: a.fdr_significant === b.fdr_significant,
    },
  ];
}
