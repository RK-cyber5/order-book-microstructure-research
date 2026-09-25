/**
 * Typed data layer for the Order Book Microstructure Lab.
 *
 * ARCHITECTURE: Frontend -> FastAPI (research service, port 3031) -> research outputs.
 * The frontend contains NO hardcoded research values; every number shown on the
 * landing page is fetched from the research API, which reads the generated
 * CSV/JSON outputs of the LOB research pipeline (source of truth).
 */

export interface ResearchSummary {
  symbol: string;
  venue: string;
  total_l2_states: number;
  sessions_count: number;
  market_time_hours: number;
  unseen_l1_ic_at_10_events: number;
  unseen_l1_ic_description: string;
  in_sample_l1_ic_at_10_events: number;
  fdr_significant_findings: number;
  fdr_note: string;
  data_note: string;
  source_files: string[];
}

export interface IcCurvePoint {
  horizon: number;
  ic: number;
}

export interface ResearchSession {
  id: string;
  label: string;
  role: string;
  role_short: string;
  valid_l2_states: number;
  time_span_hours: number;
  mean_relative_spread_bps: number;
  l1_ic_at_10_events: number;
  l1_ic_curve: IcCurvePoint[];
  median_spread_raw?: number;
  median_spread?: number;
  duration_sec?: number;
}

export interface DecayPoint {
  horizon: number;
  ic: number;
  n_obs: number;
}

export interface DecayFeature {
  key: string;
  label: string;
  session_1: DecayPoint[];
  session_2: DecayPoint[];
}

export interface SignalDecay {
  features: DecayFeature[];
  note: string;
}

export interface PipelineStage {
  stage: string;
  description: string;
}

export interface SanityNull {
  n: number;
  spearman_ic: number;
  p_value_hac: number;
  description: string;
}

export interface Methodology {
  features: { key: string; label: string }[];
  horizons_events: number[];
  split_method: string;
  inference_method: string;
  bootstrap_method: string;
  bootstrap_block_size: number;
  fdr_method: string;
  cost_assumptions: string;
  latency_assumptions_events: number[];
  random_seed: number;
  sanity_null: SanityNull;
  pipeline: PipelineStage[];
}

export interface LatencyCurvePoint {
  latency_events: number;
  gross_bps: number;
  ic: number | null;
}

export interface CostBySignalRow {
  signal: string;
  n_trades: number;
  gross_lat_0_bps: number;
  net_lat_0_bps: number;
}

export interface ExecutionData {
  flow: string[];
  session_1: {
    gross_bps: number;
    spread_cost_bps: number;
    net_bps: number;
  };
  latency_curve_session_1: LatencyCurvePoint[];
  cost_by_signal: CostBySignalRow[];
  statement: string;
  caveat: string;
}

export interface SignalSpacePoint {
  l1: number;
  l5: number;
  microprice: number;
  ofi: number;
  ret: number;
}

export interface SignalSpaceData {
  note: string;
  n_points: number;
  points: SignalSpacePoint[];
}

/* ------------------------------------------------------------------ */
/* Replay — deterministic reconstructed L2 book (ILLUSTRATIVE)        */
/* ------------------------------------------------------------------ */

export interface ReplayLevel {
  price: number;
  size: number;
}

export interface ReplayEvent {
  i: number;
  mid: number;
  spread: number;
  spread_bps: number;
  l1_imbalance: number;
  microprice: number;
  ofi: number;
  t_event_sec: number;
  bids: ReplayLevel[];
  asks: ReplayLevel[];
}

export interface ReplayTimelinePoint {
  i: number;
  mid: number;
  spread_bps: number;
  l1_imbalance: number;
  ofi: number;
}

export interface ReplayCalibration {
  l1_ic_at_10_events: number;
  median_spread_raw: number;
  mean_relative_spread_bps: number;
  base_price: number;
  session_duration_sec: number;
  ofi_mean: number;
  ofi_std: number;
  median_depth_bid: number;
}

export interface ReplayMeta {
  session: number;
  label: string;
  role: string;
  valid_l2_states: number;
  replay_events: number;
  levels_per_side: number;
  seed: number;
  calibration: ReplayCalibration;
}

export interface ReplayWindowData {
  mode: "window";
  meta: ReplayMeta;
  from_index: number;
  to_index: number;
  events: ReplayEvent[];
  provenance: string;
  note: string;
}

export interface ReplayTimelineData {
  mode: "timeline";
  meta: ReplayMeta;
  stride: number;
  points: ReplayTimelinePoint[];
  provenance: string;
  note: string;
}

/* ------------------------------------------------------------------ */
/* Experiment — one published (feature, session, horizon) result      */
/* ------------------------------------------------------------------ */

export type ExperimentStatistic = "spearman_ic" | "pearson_ic" | "dir_acc";
export type ExperimentInference = "naive" | "hac" | "bootstrap" | "fdr";

export interface ExperimentResult {
  /** Present (true) when the API echoes a found result; absent means found
   *  (the FastAPI found-response omits it, the missing-response sets false). */
  found?: true;
  feature: string;
  feature_label: string;
  session: number;
  session_id: string;
  horizon: number;
  statistic: ExperimentStatistic;
  inference: ExperimentInference;
  n_obs: number;
  spearman_ic: number | null;
  pearson_ic: number | null;
  dir_acc: number | null;
  ic_ci_low: number | null;
  ic_ci_high: number | null;
  hac_t_stat: number | null;
  p_value: number | null;
  fdr_p_value: number | null;
  fdr_significant: boolean | null;
  inference_notes: Record<ExperimentInference, string>;
  source_files: string[];
  note: string;
}

export interface ExperimentMissing {
  found: false;
  feature: string;
  session: number;
  horizon: number;
  message: string;
}

/* ------------------------------------------------------------------ */
/* Generalization                                                     */
/* ------------------------------------------------------------------ */

export interface FeatureShiftRow {
  feature: string;
  s1_mean: number | null;
  s2_mean: number | null;
  s1_std: number | null;
  s2_std: number | null;
  ks_stat: number | null;
  ks_pval: number | null;
}

export interface CrossSessionRow {
  feature: string;
  horizon: number;
  eval_type: string;
  train_n: number;
  test_n: number;
  train_spearman: number | null;
  train_ci_low: number | null;
  train_ci_high: number | null;
  test_spearman: number | null;
  test_ci_low: number | null;
  test_ci_high: number | null;
}

export interface GeneralizationData {
  sessions: ResearchSession[];
  feature_shift: FeatureShiftRow[];
  cross_session: CrossSessionRow[];
  note: string;
  shift_disclaimer: string;
  source_files: string[];
}

/* ------------------------------------------------------------------ */
/* Execution grid — modeled latency x cost surface                    */
/* ------------------------------------------------------------------ */

export interface ExecutionGridSession {
  latencies_events: number[];
  gross_bps: (number | null)[];
  ic: (number | null)[];
  cost_multipliers: number[];
  base_cost_bps: number | null;
  net_bps_grid: (number | null)[][];
}

export interface ExecutionGridSignal {
  signal: string;
  n_trades: number;
  gross_bps_by_latency: Record<string, number | null>;
  base_cost_bps: number | null;
  latencies_events: number[];
  cost_multipliers: number[];
  net_bps_grid: (number | null)[][];
}

export interface ExecutionGridData {
  sessions: Record<"Session_1" | "Session_2", ExecutionGridSession>;
  per_signal: ExecutionGridSignal[];
  model: string;
  statement: string;
  caveat: string;
  provenance: string;
  source_files: string[];
}

const BASE = "/api/research";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Research API error (${res.status}) for /${path}`);
  }
  return (await res.json()) as T;
}

export const researchApi = {
  summary: () => getJson<ResearchSummary>("summary"),
  sessions: async () => {
    const data = await getJson<{ sessions: ResearchSession[] }>("sessions");
    return data.sessions;
  },
  signalDecay: () => getJson<SignalDecay>("signal-decay"),
  methodology: () => getJson<Methodology>("methodology"),
  execution: () => getJson<ExecutionData>("execution"),
  signalSpace: () => getJson<SignalSpaceData>("illustrative/signal-space"),
  replayWindow: (session: number, start: number, end: number) =>
    getJson<ReplayWindowData>(
      `replay?session=${session}&mode=window&start=${start}&end=${end}`,
    ),
  replayTimeline: (session: number, maxPoints = 512) =>
    getJson<ReplayTimelineData>(
      `replay?session=${session}&mode=timeline&max_points=${maxPoints}`,
    ),
  experiment: async (opts: {
    feature: string;
    session: number;
    horizon: number;
    statistic?: ExperimentStatistic;
    inference?: ExperimentInference;
  }): Promise<ExperimentResult | ExperimentMissing> => {
    const params = new URLSearchParams({
      feature: opts.feature,
      session: String(opts.session),
      horizon: String(opts.horizon),
    });
    if (opts.statistic) params.set("statistic", opts.statistic);
    if (opts.inference) params.set("inference", opts.inference);
    return getJson<ExperimentResult | ExperimentMissing>(
      `experiment?${params.toString()}`,
    );
  },
  generalization: () => getJson<GeneralizationData>("generalization"),
  executionGrid: () => getJson<ExecutionGridData>("execution-grid"),
  provenance: () =>
    getJson<{
      upstream_repository: string;
      upstream_commit: string;
      upstream_commit_date: string;
      vendored: string;
      vendoring: string;
      upstream_contribution: string;
      this_project_contribution: string;
      data_availability: string;
    }>("provenance"),
};
