"""All /api/research/* endpoints (GET only, read-only).

Every response is constructed by READING the vendored research outputs via
``app.data`` — nothing is recomputed or fabricated. The single exception is
the clearly-labeled illustrative signal-space point field (deterministic,
seeded, generated once at startup).
"""

from __future__ import annotations

from fastapi import APIRouter

from .. import data
from ..models import (
    CostBySignal,
    ExecutionResponse,
    ExecutionSession,
    FeatureInfo,
    LatencyPoint,
    ManifestResponse,
    MethodologyResponse,
    PipelineStage,
    SanityNullInfo,
    SessionCurvePoint,
    SessionResponse,
    SessionsResponse,
    SignalDecayFeature,
    SignalDecayPoint,
    SignalDecayResponse,
    SignalSpacePoint,
    SignalSpaceResponse,
    SummaryResponse,
)

router = APIRouter(prefix="/research", tags=["research"])

SUMMARY_SOURCE_FILES = [
    "data_store/verified_metrics.json",
    "research/report.md",
    "research/executive_summary.md",
    "results/session_results.csv",
    "results/multiple_testing.csv",
    "results/sanity_null.csv",
    "results/session_forensics.csv",
]

FDR_NOTE = (
    "Raw count from results/multiple_testing.csv (54 signal x horizon tests): the "
    "flagged rows are all rel_spread level-vs-return regressions, a mechanical "
    "spread-persistence effect in the wide-spread unseen session. None of the "
    "predictive imbalance/flow signals (l1_imb, l5_imb_1k, l5_imb_uni, "
    "microprice_dev, ofi) survived Benjamini-Hochberg FDR, consistent with "
    "report.md: 'After FDR control, no signals achieved statistical significance.'"
)


@router.get("/summary", response_model=SummaryResponse)
def get_summary() -> SummaryResponse:
    vm = data.verified_metrics()
    return SummaryResponse(
        symbol=vm["symbol"],
        venue=vm["venue"],
        total_l2_states=int(vm["totals"]["l2_states"]),
        sessions_count=len(vm["sessions"]),
        market_time_hours=round(float(vm["totals"]["market_time_hours"]), 2),
        unseen_l1_ic_at_10_events=float(vm["headline_unseen"]["l1_ic_at_10_events"]),
        unseen_l1_ic_description=str(vm["headline_unseen"]["description"]),
        in_sample_l1_ic_at_10_events=float(vm["sessions"][0]["l1_ic_at_10_events"]),
        fdr_significant_findings=data.fdr_significant_count(),
        fdr_note=FDR_NOTE,
        data_note=(
            "Values served verbatim from generated research outputs "
            "(research_layer/results + report.md)."
        ),
        source_files=SUMMARY_SOURCE_FILES,
    )


@router.get("/sessions", response_model=SessionsResponse)
def get_sessions() -> SessionsResponse:
    vm = data.verified_metrics()
    sessions: list[SessionResponse] = []
    for s in vm["sessions"]:
        forensics = data.session_forensics_row(s["id"])
        curve = [
            SessionCurvePoint(horizon=int(pt["horizon"]), ic=float(pt["ic"]))
            for pt in data.l1_imb_curve(s["id"])
        ]
        median_spread = (
            float(forensics["median_spread"])
            if forensics["median_spread"] is not None
            else 0.0
        )
        duration_sec = (
            float(forensics["duration_sec"])
            if forensics["duration_sec"] is not None
            else 0.0
        )
        sessions.append(
            SessionResponse(
                id=s["id"],
                label=s["label"],
                role=s["role"],
                role_short=s["role_short"],
                valid_l2_states=int(s["valid_l2_states"]),
                time_span_hours=float(s["time_span_hours"]),
                mean_relative_spread_bps=float(s["mean_relative_spread_bps"]),
                l1_ic_at_10_events=float(s["l1_ic_at_10_events"]),
                l1_ic_curve=curve,
                median_spread_raw=median_spread,
                median_spread=median_spread,
                duration_sec=duration_sec,
            )
        )
    return SessionsResponse(sessions=sessions)


@router.get("/signal-decay", response_model=SignalDecayResponse)
def get_signal_decay() -> SignalDecayResponse:
    features: list[SignalDecayFeature] = []
    for key in data.SIGNAL_ORDER:
        features.append(
            SignalDecayFeature(
                key=key,
                label=data.SIGNAL_LABELS[key],
                session_1=[
                    SignalDecayPoint(
                        horizon=int(pt["horizon"]),
                        ic=float(pt["ic"]),
                        n_obs=int(pt["n_obs"]),
                    )
                    for pt in data.signal_decay_points("Session_1", key)
                ],
                session_2=[
                    SignalDecayPoint(
                        horizon=int(pt["horizon"]),
                        ic=float(pt["ic"]),
                        n_obs=int(pt["n_obs"]),
                    )
                    for pt in data.signal_decay_points("Session_2", key)
                ],
            )
        )
    return SignalDecayResponse(
        features=features,
        horizons_events=list(data.HORIZONS),
        note=(
            "Spearman information coefficient (IC) vs prediction horizon in event "
            "time, per trading session. Served from results/session_results.csv."
        ),
    )


@router.get("/methodology", response_model=MethodologyResponse)
def get_methodology() -> MethodologyResponse:
    man = data.manifest()
    sn = data.sanity_null_row()
    return MethodologyResponse(
        features=[
            FeatureInfo(key=key, label=data.SIGNAL_LABELS[key])
            for key in data.SIGNAL_ORDER
        ],
        horizons_events=[int(h) for h in man["horizons_events"]],
        # Verified narrative (executive_summary.md / report.md): the actual
        # design is cross-session walk-forward. The raw manifest string is
        # still available verbatim at /api/research/manifest.
        split_method=(
            "Chronological cross-session walk-forward: train Session 1, "
            "test unseen Session 2"
        ),
        inference_method=str(man["inference_method"]),
        bootstrap_method=str(man["bootstrap_method"]),
        bootstrap_block_size=int(man["block_size"]),
        fdr_method=str(man["fdr_method"]),
        cost_assumptions=str(man["cost_assumptions"]),
        latency_assumptions_events=[int(x) for x in man["latency_assumptions_events"]],
        random_seed=int(man["random_seeds"]),
        sanity_null=SanityNullInfo(
            n=int(sn["n"]),
            spearman_ic=float(sn["spearman_ic"]),
            p_value_hac=float(sn["p_value_hac"]),
            description="Shuffled-target null: no signal survives randomization",
        ),
        pipeline=[
            PipelineStage(
                stage="L2 EVENTS",
                description=(
                    "Ingest incremental limit-order-book diff events from the "
                    "exchange feed."
                ),
            ),
            PipelineStage(
                stage="BOOK STATE",
                description=(
                    "Reconstruct the current limit-order-book state from "
                    "incremental market-data events."
                ),
            ),
            PipelineStage(
                stage="FEATURES",
                description=(
                    "Compute imbalance, microprice deviation and order-flow "
                    "features from book state."
                ),
            ),
            PipelineStage(
                stage="SIGNALS",
                description=(
                    "Measure imbalance, microprice deviation and order-flow "
                    "information across short event-time horizons."
                ),
            ),
            PipelineStage(
                stage="OOS TESTING",
                description=(
                    "Evaluate relationships on an unseen trading session "
                    "(Session 2), parameters frozen from Session 1."
                ),
            ),
            PipelineStage(
                stage="EXECUTION",
                description=(
                    "Model aggressive spread-crossing execution with latency "
                    "and cost assumptions."
                ),
            ),
        ],
    )


@router.get("/execution", response_model=ExecutionResponse)
def get_execution() -> ExecutionResponse:
    vm = data.verified_metrics()
    em = vm["execution_modeled"]
    gross_bps = float(em["session_1_gross_bps"])
    spread_cost_bps = float(em["session_1_spread_cost_bps"])
    latency_rows = data.latency_curve("Session_1")
    costs = [
        CostBySignal(
            signal=str(row["signal"]),
            n_trades=int(row["n_trades"]),
            gross_lat_0_bps=float(row["gross_lat_0_bps"]),
            net_lat_0_bps=float(row["net_lat_0_bps"]),
        )
        for row in data.cost_by_signal_rows()
    ]
    return ExecutionResponse(
        flow=["SIGNAL", "ENTRY", "LATENCY", "SPREAD", "NET RESULT"],
        session_1=ExecutionSession(
            gross_bps=gross_bps,
            spread_cost_bps=spread_cost_bps,
            net_bps=round(gross_bps - spread_cost_bps, 3),
        ),
        latency_curve_session_1=[
            LatencyPoint(
                latency_events=int(row["latency_events"]),
                gross_bps=float(row["gross_bps"]),
                ic=(float(row["ic"]) if row["ic"] is not None else None),
            )
            for row in latency_rows
        ],
        cost_by_signal=costs,
        statement=(
            "Gross signal effects were substantially smaller than the modeled "
            "spread and latency costs under the tested aggressive execution "
            "assumptions."
        ),
        caveat=(
            "Modeled execution only. No live trading was performed and no "
            "profitability claim is made; passive execution was not evaluated."
        ),
    )


@router.get("/manifest", response_model=ManifestResponse)
def get_manifest() -> ManifestResponse:
    """Serve results/experiment_manifest.json verbatim."""
    return ManifestResponse(**data.manifest())


@router.get("/illustrative/signal-space", response_model=SignalSpaceResponse)
def get_signal_space() -> SignalSpaceResponse:
    """The ONLY synthetic endpoint — deterministic illustrative point field."""
    points = data.signal_space_points()
    return SignalSpaceResponse(
        note=(
            "Illustrative point field generated deterministically (numpy seed 42) "
            "for visualization only. This is NOT research output."
        ),
        n_points=len(points),
        points=[SignalSpacePoint(**pt) for pt in points],
    )
