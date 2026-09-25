"use client";

/**
 * SIGNAL LAB — interactive signal-analysis interface.
 *
 * RUN ANALYSIS requests the research backend (/api/research/experiment);
 * no research statistic is ever computed in the browser. All displayed
 * values are published research outputs, with missing values rendered as
 * explicit "not published" states (never interpolated, never invented).
 */

import { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
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
  TerminalButton,
  TerminalSelect,
  fmt,
  tableCls,
} from "./primitives";
import {
  HORIZONS,
  HORIZON_OPTIONS,
  INFERENCE_LABELS,
  INFERENCE_OPTIONS,
  LAB_FEATURES,
  STATISTIC_LABELS,
  STATISTIC_OPTIONS,
  fetchExperimentResult,
  recordFromMissing,
  recordFromResult,
  type ExperimentRecord,
  type ExperimentRunConfig,
} from "./experiment-client";
import { CiRange, FdrStatusChip } from "./signal-lab-chips";
import type { ExperimentResult as ExperimentResultData } from "@/lib/research";
import { ExperimentHistory } from "./experiment-history";
import { IcHorizonChart } from "./ic-horizon-chart";
import type { DecaySessionMode } from "./signal-decay-3d";
import type { SpaceFeatureKey } from "./signal-space-3d";

const SignalDecay3D = dynamic(
  () => import("./signal-decay-3d").then((m) => m.SignalDecay3D),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[340px] items-center justify-center font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        <span className="mr-3 h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
        LOADING SIGNAL-DECAY SCENE…
      </div>
    ),
  },
);

const SignalSpace3D = dynamic(
  () => import("./signal-space-3d").then((m) => m.SignalSpace3D),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[340px] items-center justify-center font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        <span className="mr-3 h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
        LOADING SIGNAL-SPACE SCENE…
      </div>
    ),
  },
);

const SPACE_FEATURE_BY_RESEARCH_KEY: Record<string, SpaceFeatureKey> = {
  l1_imb: "l1",
  l5_imb_1k: "l5",
  microprice_dev: "microprice",
  ofi: "ofi",
};

const MATRIX_FEATURE_LABELS: Record<string, string> = {
  l1_imb: "L1 Imbalance",
  l5_imb_1k: "L5 Imbalance (1/k)",
  l5_imb_uni: "L5 Imbalance (uniform)",
  microprice_dev: "Microprice Deviation",
  ofi: "OFI",
  rel_spread: "Relative Spread",
};

export function SignalsPanel() {
  /* ------------------------------------------------ lab controls ---- */
  const [feature, setFeature] = useState("l1_imb");
  const [session, setSession] = useState("1");
  const [horizon, setHorizon] = useState("10");
  const [statistic, setStatistic] = useState("spearman_ic");
  const [inference, setInference] = useState("naive");

  const [runConfig, setRunConfig] = useState<ExperimentRunConfig | null>(null);
  const runCounter = useRef(0);
  /** Every RUN ANALYSIS request, newest last (event-handler updates only —
   *  history is DERIVED from the shared TanStack cache, never set in an
   *  effect). Client-side session log, not persisted. */
  const [runs, setRuns] = useState<ExperimentRunConfig[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);

  const runAnalysis = useCallback(() => {
    runCounter.current += 1;
    const cfg: ExperimentRunConfig = {
      feature,
      session: Number(session),
      horizon: Number(horizon),
      statistic: statistic as ExperimentRunConfig["statistic"],
      inference: inference as ExperimentRunConfig["inference"],
      run: runCounter.current,
    };
    setRunConfig(cfg);
    setRuns((prev) => [...prev, cfg].slice(-24));
  }, [feature, session, horizon, statistic, inference]);

  const loadRecord = useCallback((r: ExperimentRecord) => {
    setFeature(r.feature);
    setSession(String(r.session));
    setHorizon(String(r.horizon));
    setStatistic(r.statistic);
    setInference(r.inference);
    runCounter.current += 1;
    setRunConfig({
      feature: r.feature,
      session: r.session,
      horizon: r.horizon,
      statistic: r.statistic,
      inference: r.inference,
      run: runCounter.current,
    });
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  /* --------------------------------------------- experiment query ---- */
  const experiment = useQuery({
    queryKey: ["research", "experiment", runConfig],
    queryFn: () => fetchExperimentResult(runConfig!),
    enabled: runConfig !== null,
  });

  // History results come from the same shared cache (keys identical to the
  // active run's query), so re-opening an old run resolves instantly.
  const runQueries = useQueries({
    queries: runs.map((cfg) => ({
      queryKey: ["research", "experiment", cfg],
      queryFn: () => fetchExperimentResult(cfg),
      staleTime: 5 * 60 * 1000,
      retry: 1,
    })),
  });

  const records: ExperimentRecord[] = useMemo(() => {
    const out: ExperimentRecord[] = [];
    runs.forEach((cfg, i) => {
      const d = runQueries[i]?.data;
      if (d === undefined) return; // pending — appears once resolved
      if (d.found === false) {
        out.push(recordFromMissing(cfg, i + 1));
        return;
      }
      out.push(recordFromResult(cfg, d, i + 1));
    });
    return out;
  }, [runs, runQueries]);

  /* -------------------------------------------- shared data queries -- */
  const decay = useQuery({
    queryKey: ["research", "signal-decay"],
    queryFn: researchApi.signalDecay,
  });
  const space = useQuery({
    queryKey: ["research", "illustrative-signal-space"],
    queryFn: researchApi.signalSpace,
  });

  /* ----------------------------------------------- chart selectors ---- */
  const [chartFeature, setChartFeature] = useState("l1_imb");
  const [showS1, setShowS1] = useState(true);
  const [showS2, setShowS2] = useState(true);
  const [matrixHorizon, setMatrixHorizon] = useState(10);
  const [decayMode, setDecayMode] = useState<DecaySessionMode>("both");

  /* ------------------------------------------- signal-space controls -- */
  const [spaceFeature, setSpaceFeature] = useState<SpaceFeatureKey>("l1");
  const [spaceHorizon, setSpaceHorizon] = useState(10);
  const [spaceSession, setSpaceSession] = useState(1);

  const decayFeatures = decay.data?.features ?? [];
  const chartFeatureData = useMemo(
    () => decayFeatures.find((f) => f.key === chartFeature) ?? null,
    [decayFeatures, chartFeature],
  );

  // Real published IC for the signal-space caption (feature/session/horizon).
  const spaceIc = useMemo(() => {
    const researchKey =
      Object.keys(SPACE_FEATURE_BY_RESEARCH_KEY).find(
        (k) => SPACE_FEATURE_BY_RESEARCH_KEY[k] === spaceFeature,
      ) ?? "l1_imb";
    const f = decayFeatures.find((x) => x.key === researchKey);
    if (!f) return null;
    const pts = spaceSession === 1 ? f.session_1 : f.session_2;
    return pts.find((p) => p.horizon === spaceHorizon) ?? null;
  }, [decayFeatures, spaceFeature, spaceSession, spaceHorizon]);

  const result = experiment.data;

  return (
    <div className="flex flex-col gap-4">
      {/* ============================================ RUN ANALYSIS ==== */}
      <PanelShell
        id="signal-lab"
        title="Signal Lab — Run Analysis"
        meta="PUBLISHED RESULTS ONLY · NO BROWSER COMPUTATION"
        badge={<ProvenanceBadge kind="research" compact />}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <TerminalSelect
            label="Feature"
            value={feature}
            options={LAB_FEATURES}
            onChange={setFeature}
          />
          <TerminalSelect
            label="Session"
            value={session}
            options={[
              { value: "1", label: "Session 01 · Train" },
              { value: "2", label: "Session 02 · Unseen" },
            ]}
            onChange={setSession}
          />
          <TerminalSelect
            label="Horizon"
            value={horizon}
            options={HORIZON_OPTIONS}
            onChange={setHorizon}
            hint="Prediction horizon in events"
          />
          <TerminalSelect
            label="Statistic"
            value={statistic}
            options={STATISTIC_OPTIONS}
            onChange={setStatistic}
          />
          <TerminalSelect
            label="Inference"
            value={inference}
            options={INFERENCE_OPTIONS}
            onChange={setInference}
          />
          <div className="flex items-end">
            <TerminalButton
              onClick={runAnalysis}
              className="w-full"
              title="Request the published result for this selection from the research backend"
            >
              <Play className="h-3 w-3" aria-hidden="true" />
              Run Analysis
            </TerminalButton>
          </div>
        </div>

        {/* ------------------------------------------- result block ---- */}
        <div ref={resultRef} className="mt-4">
          {!runConfig ? (
            <p className="border border-dashed border-hairline bg-panel px-3 py-4 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
              Select parameters and run analysis — results are served from
              published research outputs only
            </p>
          ) : experiment.isLoading ? (
            <div className="flex items-center gap-3 px-1 py-5 font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              REQUESTING PUBLISHED RESULT…
            </div>
          ) : experiment.isError ? (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-md border border-ask/30 bg-ask/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink">
                RESEARCH DATA UNAVAILABLE
              </p>
              <TerminalButton variant="secondary" onClick={() => experiment.refetch()}>
                Retry
              </TerminalButton>
            </div>
          ) : result?.found === false ? (
            <p className="border border-amber-400/50 bg-amber-50/70 px-3 py-3 font-mono text-[10px] leading-relaxed text-amber-900">
              NOT PUBLISHED — {result.message} Missing values are never
              interpolated.
            </p>
          ) : result ? (
            <ExperimentResultBlock result={result} />
          ) : null}
        </div>
      </PanelShell>

      {/* ============================================== IC vs HORIZON ==== */}
      <PanelShell
        id="ic-horizon"
        title="IC vs Horizon"
        meta="SPEARMAN IC · RESULTS/SESSION_RESULTS.CSV"
        badge={<ProvenanceBadge kind="research" compact />}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <TerminalSelect
            label="Feature"
            value={chartFeature}
            options={LAB_FEATURES}
            onChange={setChartFeature}
            className="w-44"
          />
          <div className="flex items-end gap-1.5 pb-0.5">
            <ChipToggle label="S01 · Train" pressed={showS1} onClick={() => setShowS1((v) => !v)} />
            <ChipToggle label="S02 · Unseen" pressed={showS2} onClick={() => setShowS2((v) => !v)} />
          </div>
          <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
            {runConfig ? `LAB SELECTION · h = ${runConfig.horizon}` : "SELECT A HORIZON IN THE LAB ABOVE"}
          </span>
        </div>
        <QueryState
          isLoading={decay.isLoading}
          error={decay.error}
          data={chartFeatureData ?? undefined}
          onRetry={() => decay.refetch()}
          skeleton="LOADING IC CURVES…"
        >
          {(f) => (
            <IcHorizonChart
              s1={f.session_1}
              s2={f.session_2}
              showS1={showS1}
              showS2={showS2}
              selectedHorizon={runConfig?.horizon ?? null}
              featureLabel={f.label}
            />
          )}
        </QueryState>
      </PanelShell>

      {/* ============================================== IC MATRIX ==== */}
      <PanelShell
        id="ic-matrix"
        title="IC Matrix — Feature × Session"
        meta="SPEARMAN IC · FEATURE COMPARISON · SESSION COMPARISON"
        badge={<ProvenanceBadge kind="research" compact />}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Micro>Horizon</Micro>
          <div className="flex flex-wrap gap-1.5">
            {HORIZONS.map((h) => (
              <ChipToggle
                key={h}
                label={`${h}`}
                pressed={matrixHorizon === h}
                onClick={() => setMatrixHorizon(h)}
                title={`IC matrix at horizon ${h} events`}
              />
            ))}
          </div>
        </div>
        <QueryState
          isLoading={decay.isLoading}
          error={decay.error}
          data={decay.data}
          onRetry={() => decay.refetch()}
          skeleton="LOADING IC MATRIX…"
        >
          {(d) => (
            <div className="max-h-96 overflow-auto border border-hairline bg-white [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-ink/15 [&::-webkit-scrollbar-track]:bg-transparent">
              <table className={cn(tableCls.table, "min-w-[560px]")}>
                <thead>
                  <tr>
                    <th className={tableCls.th}>Feature</th>
                    <th className={cn(tableCls.th, "text-right")}>S01 IC · n</th>
                    <th className={cn(tableCls.th, "text-right")}>S02 IC · n</th>
                    <th className={cn(tableCls.th, "text-right")}>Δ (S02−S01)</th>
                  </tr>
                </thead>
                <tbody>
                  {d.features.map((f) => {
                    const p1 = f.session_1.find((p) => p.horizon === matrixHorizon);
                    const p2 = f.session_2.find((p) => p.horizon === matrixHorizon);
                    const delta =
                      p1 && p2 && p1.ic !== null && p2.ic !== null ? p2.ic - p1.ic : null;
                    return (
                      <tr
                        key={f.key}
                        className={cn(
                          "transition-colors",
                          f.key === feature ? "bg-accent-soft/40" : "hover:bg-panel/70",
                        )}
                      >
                        <td className={cn(tableCls.td, "font-semibold text-ink")}>
                          {MATRIX_FEATURE_LABELS[f.key] ?? f.label}
                        </td>
                        <td className={tableCls.tdNum}>
                          <span className="text-ink">{fmt.dec(p1?.ic ?? null, 4)}</span>
                          <span className="ml-1.5 text-[8.5px] text-faint">
                            {fmt.int(p1?.n_obs ?? null)}
                          </span>
                        </td>
                        <td className={tableCls.tdNum}>
                          <span className="text-ink">{fmt.dec(p2?.ic ?? null, 4)}</span>
                          <span className="ml-1.5 text-[8.5px] text-faint">
                            {fmt.int(p2?.n_obs ?? null)}
                          </span>
                        </td>
                        <td className={tableCls.tdNum}>
                          {delta === null ? <NaCell /> : fmt.signed(delta, 4)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </QueryState>
        <NoteStrip tone="neutral" className="mt-3">
          IC = Spearman rank correlation between the feature and the future
          event-time return at the selected horizon. S01 = development session,
          S02 = unseen out-of-sample session. Values verbatim from
          results/session_results.csv — missing cells are never interpolated.
        </NoteStrip>
      </PanelShell>

      {/* ======================================== SIGNAL DECAY 3D ==== */}
      <PanelShell
        id="signal-decay-3d"
        title="Signal Decay — IC × Horizon × Feature"
        meta="X = HORIZON · Y = FEATURE LANE · Z = SPEARMAN IC"
        badge={<ProvenanceBadge kind="research" compact />}
      >
        <div className="mb-3 flex flex-wrap gap-1.5">
          <ChipToggle label="Session 01" pressed={decayMode === "s1"} onClick={() => setDecayMode("s1")} />
          <ChipToggle label="Session 02" pressed={decayMode === "s2"} onClick={() => setDecayMode("s2")} />
          <ChipToggle label="Both" pressed={decayMode === "both"} onClick={() => setDecayMode("both")} />
        </div>
        <QueryState
          isLoading={decay.isLoading}
          error={decay.error}
          data={decay.data}
          onRetry={() => decay.refetch()}
          skeleton="LOADING DECAY MATRIX…"
        >
          {(d) => <SignalDecay3D features={d.features} mode={decayMode} />}
        </QueryState>
        <NoteStrip tone="neutral" className="mt-3">
          How measured information varies with event horizon: every bar is one
          published (feature, horizon, session) Spearman IC — bars below the base
          plane are negative. Hover a bar for its exact value and sample size.
        </NoteStrip>
      </PanelShell>

      {/* ======================================== SIGNAL SPACE 3D ==== */}
      <PanelShell
        id="signal-space"
        title="Signal Space — Feature × Microprice × Return"
        meta="ILLUSTRATIVE POINT FIELD · NOT RESEARCH OBSERVATIONS"
        badge={<ProvenanceBadge kind="illustrative" compact />}
      >
        <div className="mb-3 grid grid-cols-3 gap-2">
          <TerminalSelect
            label="Feature (X)"
            value={spaceFeature}
            options={[
              { value: "l1", label: "L1 Imbalance" },
              { value: "l5", label: "L5 Imbalance" },
              { value: "microprice", label: "Microprice Dev" },
              { value: "ofi", label: "OFI" },
            ]}
            onChange={(v) => setSpaceFeature(v as SpaceFeatureKey)}
          />
          <TerminalSelect
            label="Horizon"
            value={String(spaceHorizon)}
            options={HORIZON_OPTIONS}
            onChange={(v) => setSpaceHorizon(Number(v))}
            hint="Selects the published IC shown in the caption — the point field itself is horizon-independent"
          />
          <TerminalSelect
            label="Session"
            value={String(spaceSession)}
            options={[
              { value: "1", label: "Session 01 · Train" },
              { value: "2", label: "Session 02 · Unseen" },
            ]}
            onChange={(v) => setSpaceSession(Number(v))}
            hint="Selects the published IC shown in the caption — the point field itself is session-independent"
          />
        </div>
        <QueryState
          isLoading={space.isLoading}
          error={space.error}
          data={space.data}
          onRetry={() => space.refetch()}
          skeleton="LOADING POINT FIELD…"
        >
          {(d) => (
            <SignalSpace3D
              points={d.points}
              feature={spaceFeature}
              overlay={
                <div className="pointer-events-none absolute left-3 top-3 z-20 flex max-w-[280px] flex-col gap-1.5">
                  <div className="rounded-md border border-emerald-600/25 bg-white/90 px-2.5 py-1.5 shadow-sm backdrop-blur-sm">
                    <p className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.16em] text-emerald-800">
                      Research output · context
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] tabular-nums leading-relaxed text-ink">
                      {spaceFeature.toUpperCase()} · S0{spaceSession} · h={spaceHorizon} →{" "}
                      {spaceIc ? `IC ${fmt.dec(spaceIc.ic, 4)} · n ${fmt.int(spaceIc.n_obs)}` : "NOT PUBLISHED"}
                    </p>
                  </div>
                  <div className="rounded-md border border-amber-400/40 bg-amber-50/90 px-2.5 py-1.5 shadow-sm backdrop-blur-sm">
                    <p className="font-mono text-[9px] leading-relaxed text-amber-900">
                      ILLUSTRATIVE POINT FIELD — does not vary with horizon/session
                      (event-level observations not published). Points are not
                      research observations.
                    </p>
                  </div>
                </div>
              }
            />
          )}
        </QueryState>
        <NoteStrip tone="amber" icon="⚠" className="mt-3">
          The point cloud explores how microstructure variables relate to future
          return in shape (deterministic, seed-42 field). Because event-level
          observations are not published, the cloud cannot answer questions
          about specific horizons or sessions — use the published IC matrix and
          decay scene for measured values.
        </NoteStrip>
      </PanelShell>

      {/* ===================================== EXPERIMENT HISTORY ==== */}
      <ExperimentHistory
        records={records}
        onLoad={loadRecord}
        onClear={() => setRuns([])}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Result block                                                        */
/* ------------------------------------------------------------------ */

function ExperimentResultBlock({
  result,
}: {
  result: ExperimentResultData;
}) {
  const statLabel = STATISTIC_LABELS[result.statistic] ?? "Spearman IC";
  const statValue = result[result.statistic];
  const inferenceNote = result.inference_notes[result.inference];

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatCell
          label={statLabel}
          value={fmt.dec(statValue ?? null, 4)}
          tone="accent"
          hint="Published value for the selected statistic (results/session_results.csv)"
        />
        <StatCell
          label="Sample Size"
          value={fmt.int(result.n_obs)}
          hint="Valid observations for this feature/session/horizon"
        />
        <StatCell
          label="95% CI (block bootstrap)"
          value={<CiRange low={result.ic_ci_low} high={result.ic_ci_high} />}
          hint="Stationary block bootstrap (block size 100) confidence interval"
        />
        <StatCell
          label="HAC t-stat"
          value={
            result.hac_t_stat === null ? (
              <NaCell title="HAC statistic not published for this selection" />
            ) : (
              fmt.signed(result.hac_t_stat, 4)
            )
          }
          hint="Newey-West HAC OLS t-statistic (results/multiple_testing.csv)"
        />
        <StatCell
          label="p-value"
          value={
            result.p_value === null ? (
              <NaCell title="p-value not published for this selection" />
            ) : (
              fmt.sci(result.p_value)
            )
          }
          hint="Raw two-sided p-value (results/multiple_testing.csv)"
        />
        <div className="flex min-w-0 items-center border border-hairline bg-panel px-2.5 py-2">
          <div>
            <div className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.18em] text-faint">
              FDR status
            </div>
            <div className="mt-1">
              <FdrStatusChip status={result.fdr_significant} />
            </div>
          </div>
        </div>
      </div>

      <NoteStrip tone="neutral">
        {inferenceNote}
      </NoteStrip>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
        <span>
          {result.feature_label} · {result.session_id.toUpperCase()} · h =
          {result.horizon} EVENTS
        </span>
        <span>SOURCE · {result.source_files.join(" · ")}</span>
      </div>
    </div>
  );
}

/* Re-exported for potential reuse; keeps tree-shaking honest. */
