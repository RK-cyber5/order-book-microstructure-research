/**
 * Experiment client — fetches ONE published experiment result from the
 * research API (feature / session / horizon / statistic / inference).
 *
 * PROVENANCE: values are served verbatim from the FastAPI research service
 * (port 3031); NOTHING is computed in the browser.
 *
 * ROUTING NOTE: the Next.js proxy route (`/api/research/[...path]`) forwards
 * only the path, not the query string, so parameterised endpoints cannot be
 * reached through it. Two relative access paths are therefore tried, in order:
 *
 *   1. `/api/research/experiment?…`            — Next.js proxy (works when the
 *      proxy forwards queries);
 *   2. `/api/research/experiment?…&XTransformPort=3031` — the sanctioned
 *      Caddy gateway query routing to the research service directly.
 *
 * Every response is echo-verified (feature/session/horizon/statistic/
 * inference must match the request) so a parameter-dropping hop can never
 * surface silently-wrong data. Deterministic research outputs: no wall-clock,
 * no randomness.
 */

import type {
  ExperimentInference,
  ExperimentMissing,
  ExperimentResult,
  ExperimentStatistic,
} from "@/lib/research";

const RESEARCH_SERVICE_PORT = 3031;

/* ------------------------------------------------------------------ */
/* Control option constants (labels only — never research values)     */
/* ------------------------------------------------------------------ */

export const STATISTIC_LABELS: Record<ExperimentStatistic, string> = {
  spearman_ic: "Spearman IC",
  pearson_ic: "Pearson IC",
  dir_acc: "Directional Accuracy",
};

export const INFERENCE_LABELS: Record<ExperimentInference, string> = {
  naive: "Naive",
  hac: "HAC / Newey-West",
  bootstrap: "Block Bootstrap",
  fdr: "FDR (B-H)",
};

export const LAB_FEATURES: { value: string; label: string }[] = [
  { value: "l1_imb", label: "L1 Imbalance" },
  { value: "l5_imb_1k", label: "L5 Imbalance (1/k)" },
  { value: "microprice_dev", label: "Microprice Deviation" },
  { value: "ofi", label: "OFI" },
];

export const HORIZONS: number[] = [1, 2, 5, 10, 20, 50, 100, 250, 500];

export const HORIZON_OPTIONS: { value: string; label: string }[] = HORIZONS.map(
  (h) => ({ value: String(h), label: String(h) }),
);

export const STATISTIC_OPTIONS: { value: string; label: string }[] = (
  Object.keys(STATISTIC_LABELS) as ExperimentStatistic[]
).map((k) => ({ value: k, label: STATISTIC_LABELS[k] }));

export const INFERENCE_OPTIONS: { value: string; label: string }[] = (
  Object.keys(INFERENCE_LABELS) as ExperimentInference[]
).map((k) => ({ value: k, label: INFERENCE_LABELS[k] }));

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface ExperimentRunConfig {
  feature: string;
  session: number;
  horizon: number;
  statistic: ExperimentStatistic;
  inference: ExperimentInference;
  /** Run sequence number — increments on every RUN / VIEW-load; used as the
   *  run "timestamp" (wall-clock is forbidden in research logic). */
  run: number;
}

export interface ExperimentRecord {
  id: string;
  run: number;
  feature: string;
  featureLabel: string;
  session: number;
  horizon: number;
  statistic: ExperimentStatistic;
  inference: ExperimentInference;
  /** null when the run's result is not published. */
  n_obs: number | null;
  /** The value of the SELECTED statistic for this run. */
  result: number | null;
  /** True when the API answered found=false (kept for honest history rows). */
  notPublished?: boolean;
  /** Full published fields kept so the A/B comparison strip never refetches. */
  spearman_ic: number | null;
  pearson_ic: number | null;
  dir_acc: number | null;
  ic_ci_low: number | null;
  ic_ci_high: number | null;
  hac_t_stat: number | null;
  p_value: number | null;
  fdr_significant: boolean | null;
}

/* ------------------------------------------------------------------ */
/* Fetch                                                               */
/* ------------------------------------------------------------------ */

/** Client-side memo of whether the Next proxy forwards query strings. */
let proxyForwardsQuery = true;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Research API error (${res.status}) for ${url.split("?")[0]}`);
  }
  return (await res.json()) as T;
}

function echoMatches(
  d: ExperimentResult | ExperimentMissing,
  p: ExperimentRunConfig,
): boolean {
  if (d.feature !== p.feature || d.session !== p.session || d.horizon !== p.horizon) {
    return false;
  }
  if (d.found === false) return true;
  return d.statistic === p.statistic && d.inference === p.inference;
}

export async function fetchExperimentResult(
  p: ExperimentRunConfig,
): Promise<ExperimentResult | ExperimentMissing> {
  const qs = new URLSearchParams({
    feature: p.feature,
    session: String(p.session),
    horizon: String(p.horizon),
    statistic: p.statistic,
    inference: p.inference,
  });

  if (proxyForwardsQuery) {
    try {
      const d = await getJson<ExperimentResult | ExperimentMissing>(
        `/api/research/experiment?${qs.toString()}`,
      );
      if (echoMatches(d, p)) return d;
      proxyForwardsQuery = false;
    } catch {
      proxyForwardsQuery = false;
    }
  }

  const d = await getJson<ExperimentResult | ExperimentMissing>(
    `/api/research/experiment?${qs.toString()}&XTransformPort=${RESEARCH_SERVICE_PORT}`,
  );
  if (!echoMatches(d, p)) {
    throw new Error("Research API returned an experiment payload that does not match the request");
  }
  return d;
}

/* ------------------------------------------------------------------ */
/* Record construction (history log — client-side only)                */
/* ------------------------------------------------------------------ */

export function recordFromResult(
  cfg: ExperimentRunConfig,
  data: ExperimentResult,
  index: number,
): ExperimentRecord {
  return {
    id: `EXP-${String(index).padStart(3, "0")}`,
    run: cfg.run,
    feature: cfg.feature,
    featureLabel: LAB_FEATURES.find((f) => f.value === cfg.feature)?.label ?? cfg.feature,
    session: cfg.session,
    horizon: cfg.horizon,
    statistic: cfg.statistic,
    inference: cfg.inference,
    n_obs: data.n_obs,
    result: data[cfg.statistic],
    spearman_ic: data.spearman_ic,
    pearson_ic: data.pearson_ic,
    dir_acc: data.dir_acc,
    ic_ci_low: data.ic_ci_low,
    ic_ci_high: data.ic_ci_high,
    hac_t_stat: data.hac_t_stat,
    p_value: data.p_value,
    fdr_significant: data.fdr_significant,
  };
}

/** History row for a run whose result is NOT PUBLISHED (found=false). */
export function recordFromMissing(
  cfg: ExperimentRunConfig,
  index: number,
): ExperimentRecord {
  return {
    id: `EXP-${String(index).padStart(3, "0")}`,
    run: cfg.run,
    feature: cfg.feature,
    featureLabel: LAB_FEATURES.find((f) => f.value === cfg.feature)?.label ?? cfg.feature,
    session: cfg.session,
    horizon: cfg.horizon,
    statistic: cfg.statistic,
    inference: cfg.inference,
    n_obs: null,
    result: null,
    notPublished: true,
    spearman_ic: null,
    pearson_ic: null,
    dir_acc: null,
    ic_ci_low: null,
    ic_ci_high: null,
    hac_t_stat: null,
    p_value: null,
    fdr_significant: null,
  };
}
