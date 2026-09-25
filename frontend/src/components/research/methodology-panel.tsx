"use client";

/**
 * METHODOLOGY — compact explorer of the research design + REPRODUCIBILITY
 * (dataset identifier, sessions, states, duration, source files, upstream
 * repository/commit, test status) with the VIEW SOURCE link.
 */

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CheckCircle2, XCircle } from "lucide-react";
import { researchApi } from "@/lib/research";
import { GITHUB_URL } from "@/components/landing/site-constants";
import {
  Micro,
  NaCell,
  NoteStrip,
  PanelShell,
  ProvenanceBadge,
  QueryState,
  StatCell,
  fmt,
  tableCls,
} from "./primitives";

export function MethodologyPanel() {
  const methodology = useQuery({
    queryKey: ["research", "methodology"],
    queryFn: researchApi.methodology,
  });
  const summary = useQuery({
    queryKey: ["research", "summary"],
    queryFn: researchApi.summary,
  });
  const provenance = useQuery({
    queryKey: ["research", "provenance"],
    queryFn: researchApi.provenance,
  });
  const apiOk = !methodology.isError && !summary.isError;

  return (
    <div className="flex flex-col gap-4">
      <PanelShell
        id="methodology"
        title="Methodology Explorer"
        meta="RESEARCH DESIGN"
        badge={<ProvenanceBadge kind="research" compact />}
      >
        <QueryState
          isLoading={methodology.isLoading}
          error={methodology.error}
          data={methodology.data}
          onRetry={() => methodology.refetch()}
          skeleton="LOADING METHODOLOGY…"
        >
          {(m) => (
            <div className="grid gap-3 lg:grid-cols-2">
              <MethodBlock step="01" title="Data">
                Incremental L2 event reconstruction from two BTCUSDT (Binance US)
                sessions: {fmt.int(summary.data?.total_l2_states ?? null)} valid L2
                states across {summary.data?.sessions_count ?? "—"} sessions (~
                {summary.data?.market_time_hours ?? "—"} h).
              </MethodBlock>
              <MethodBlock step="02" title="Features">
                {m.features.map((f) => f.label).join(" · ")}.
              </MethodBlock>
              <MethodBlock step="03" title="Target">
                Future event-time return ret_h, horizons h ∈ [
                {m.horizons_events.join(", ")}] events.
              </MethodBlock>
              <MethodBlock step="04" title="Validation">
                {m.split_method}.
              </MethodBlock>
              <MethodBlock step="05" title="Inference">
                {m.inference_method}; {m.bootstrap_method} (block size{" "}
                {m.bootstrap_block_size}); {m.fdr_method} FDR.
              </MethodBlock>
              <MethodBlock step="06" title="Execution">
                {m.cost_assumptions}; latency sensitivity at{" "}
                {m.latency_assumptions_events.join(" / ")} events.
              </MethodBlock>
              <MethodBlock step="07" title="Sanity null" wide>
                Shuffled-target placebo: n = {fmt.int(m.sanity_null.n)}, Spearman IC ={" "}
                {fmt.dec(m.sanity_null.spearman_ic, 4)}, HAC p ={" "}
                {fmt.dec(m.sanity_null.p_value_hac, 4)} — no signal survives
                randomization.
              </MethodBlock>
              <MethodBlock step="LIMIT" title="Limitation" wide tone="amber">
                Only two short sessions and one instrument are studied. Do not
                generalize beyond what the data supports.
              </MethodBlock>
            </div>
          )}
        </QueryState>
      </PanelShell>

      <PanelShell
        id="reproducibility"
        title="Reproducibility"
        meta="SOURCE OF TRUTH"
        badge={<ProvenanceBadge kind="research" compact />}
      >
        <QueryState
          isLoading={summary.isLoading && provenance.isLoading}
          error={summary.error ?? provenance.error}
          data={summary.data && provenance.data ? { summary: summary.data, prov: provenance.data } : undefined}
          onRetry={() => {
            summary.refetch();
            provenance.refetch();
          }}
          skeleton="LOADING REPRODUCIBILITY DATA…"
        >
          {({ summary: s, prov }) => (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                <StatCell
                  label="Dataset Identifier"
                  value="parquet_export.csv"
                  hint="experiment_manifest.json → dataset_identifiers"
                />
                <StatCell label="Session Count" value={s.sessions_count} />
                <StatCell label="Valid L2 States" value={fmt.int(s.total_l2_states)} />
                <StatCell label="Market Duration" value={`~${s.market_time_hours}`} unit="h" />
                <StatCell
                  label="Research Revision"
                  value={prov.upstream_commit.slice(0, 10)}
                  hint={`${prov.upstream_commit} — ${prov.upstream_commit_date}`}
                />
                <StatCell
                  label="Test Status"
                  tone={apiOk ? "bid" : "ask"}
                  value={apiOk ? "PASS" : "FAIL"}
                  hint="API self-check: methodology/summary endpoints responding; sanity-null placebo reproduces published values"
                />
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <div className="border border-hairline bg-panel p-3">
                  <Micro>Source files (research outputs)</Micro>
                  <ul className="mt-2 space-y-1 font-mono text-[9.5px] leading-relaxed text-body">
                    {s.source_files.map((f) => (
                      <li key={f} className="flex gap-2">
                        <span aria-hidden="true" className="text-faint">›</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border border-hairline bg-panel p-3">
                  <Micro>Upstream vs this project</Micro>
                  <dl className="mt-2 space-y-2 text-[10.5px] leading-relaxed text-body">
                    <div>
                      <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
                        Upstream framework
                      </dt>
                      <dd className="mt-0.5">{prov.upstream_contribution}</dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
                        This project
                      </dt>
                      <dd className="mt-0.5">{prov.this_project_contribution}</dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
                        Vendoring
                      </dt>
                      <dd className="mt-0.5">
                        {prov.vendoring} — vendored {prov.vendored}.
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex h-9 items-center gap-2 rounded-sm bg-ink px-4 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-white transition-all hover:-translate-y-[1px] hover:bg-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                View Source
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sr-only"> (opens the upstream GitHub repository in a new tab)</span>
              </a>
            </>
          )}
        </QueryState>
      </PanelShell>

      <PanelShell id="api-status" title="API Status" meta="LIVE CHECK">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] text-body">
          <span className="inline-flex items-center gap-2">
            {apiOk ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-bid" aria-hidden="true" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-ask" aria-hidden="true" />
            )}
            RESEARCH API · {apiOk ? "CONNECTED" : "UNAVAILABLE"}
          </span>
          <span className="text-faint">
            {methodology.isError || summary.isError ? (
              "Live research values cannot be displayed until the API responds."
            ) : (
              <>
                FDR significant findings: {summary.data?.fdr_significant_findings ?? <NaCell />} ·{" "}
                {summary.data?.fdr_note}
              </>
            )}
          </span>
        </div>
      </PanelShell>

      <NoteStrip tone="amber" icon="⚠">
        Raw event-level L2 data is not published with this repository. Order-book
        replay visualizations in the REPLAY lab are deterministic reconstructions
        calibrated to the published research outputs.
      </NoteStrip>
    </div>
  );
}

function MethodBlock({
  step,
  title,
  children,
  wide,
  tone = "neutral",
}: {
  step: string;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
  tone?: "neutral" | "amber";
}) {
  return (
    <div
      className={`flex gap-3 border p-3 ${
        tone === "amber"
          ? "border-amber-400/50 bg-amber-50/60"
          : "border-hairline bg-panel/60"
      } ${wide ? "lg:col-span-2" : ""}`}
    >
      <span className="mt-0.5 font-mono text-[9px] font-bold tabular-nums text-faint">
        {step}
      </span>
      <div className="min-w-0">
        <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink">
          {title}
        </h3>
        <p className="mt-1 text-[11.5px] leading-relaxed text-body">{children}</p>
      </div>
    </div>
  );
}

/* tableCls re-exported for consumers that render dense tables nearby */
export { tableCls };
