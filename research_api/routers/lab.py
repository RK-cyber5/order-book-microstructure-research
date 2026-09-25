"""Research-lab endpoints added for the interactive terminal.

- /api/research/replay          deterministic reconstructed L2 book (illustrative)
- /api/research/experiment      one published (feature, session, horizon) result
- /api/research/generalization  distribution shift + cross-session IC
- /api/research/execution-grid  modeled latency x cost-multiplier surface

All values are READ from the vendored research outputs (or, for replay only,
from the clearly-labeled deterministic reconstruction) — nothing is fabricated.
"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException, Query

from .. import data
from ..models import (
    CrossSessionRow,
    ExecutionGridResponse,
    ExecutionGridSession,
    ExecutionGridSignal,
    ExperimentMissingResponse,
    ExperimentResponse,
    FeatureShiftRow,
    GeneralizationResponse,
    ReplayEvent,
    ReplayMeta,
    ReplayTimelinePoint,
    ReplayTimelineResponse,
    ReplayWindowResponse,
    SessionResponse,
    SessionCurvePoint,
)

router = APIRouter(prefix="/research", tags=["lab"])

REPLAY_PROVENANCE = (
    "Raw event-level L2 data is not published with this repository. "
    "The visualization below is a deterministic reconstruction calibrated "
    "to the published research outputs."
)
REPLAY_NOTE = (
    "RECONSTRUCTED — ILLUSTRATIVE. Deterministic (numpy seed per session), "
    "generated once and cached server-side; identical on every request. "
    "This is NOT raw exchange event replay and NOT live market data."
)

REPLAY_WINDOW_MAX = 400
REPLAY_TIMELINE_MAX_POINTS = 600


def _replay_meta(session: int) -> ReplayMeta:
    m = data.replay_params_public(session)
    return ReplayMeta(**m)


@router.get("/replay", response_model=None)
def get_replay(
    session: int = Query(1, ge=1, le=2, description="1 = Session 1, 2 = Session 2"),
    mode: Literal["window", "timeline"] = Query("window"),
    start: int = Query(0, ge=0, description="First event index (window mode)"),
    end: int = Query(
        120, ge=0, description="Exclusive last event index (window mode)"
    ),
    max_points: int = Query(
        512, ge=50, le=REPLAY_TIMELINE_MAX_POINTS,
        description="Approximate point cap (timeline mode)",
    ),
) -> ReplayWindowResponse | ReplayTimelineResponse:
    series = data.replay_series(session)
    events = series["events"]
    n = len(events)
    meta = _replay_meta(session)

    if mode == "timeline":
        stride = max(1, -(-n // max_points))  # ceil division
        points = [
            ReplayTimelinePoint(
                i=e["i"],
                mid=e["mid"],
                spread_bps=e["spread_bps"],
                l1_imbalance=e["l1_imbalance"],
                ofi=e["ofi"],
            )
            for e in events[::stride]
        ]
        return ReplayTimelineResponse(
            mode="timeline",
            meta=meta,
            stride=stride,
            points=points,
            provenance=REPLAY_PROVENANCE,
            note=REPLAY_NOTE,
        )

    start = max(0, min(start, n - 1))
    end = max(start + 1, min(end, n))
    if end - start > REPLAY_WINDOW_MAX:
        end = start + REPLAY_WINDOW_MAX
    return ReplayWindowResponse(
        mode="window",
        meta=meta,
        from_index=start,
        to_index=end,
        events=[ReplayEvent(**e) for e in events[start:end]],
        provenance=REPLAY_PROVENANCE,
        note=REPLAY_NOTE,
    )


@router.get("/experiment", response_model=None)
def get_experiment(
    feature: str = Query(..., description="Research feature key"),
    session: int = Query(..., ge=1, le=2),
    horizon: int = Query(..., ge=1, le=500),
    statistic: Literal[
        "spearman_ic", "pearson_ic", "dir_acc"
    ] = Query("spearman_ic"),
    inference: Literal["naive", "hac", "bootstrap", "fdr"] = Query("naive"),
) -> ExperimentResponse | ExperimentMissingResponse:
    if feature not in data.SIGNAL_LABELS:
        raise HTTPException(
            status_code=422,
            detail=(
                f"unknown feature '{feature}'; expected one of "
                f"{sorted(data.SIGNAL_LABELS)}"
            ),
        )
    if horizon not in data.HORIZONS:
        raise HTTPException(
            status_code=422,
            detail=(
                f"horizon {horizon} has no published results; published "
                f"horizons are {data.HORIZONS}"
            ),
        )
    res = data.experiment_result(feature, session, horizon)
    if res is None:
        return ExperimentMissingResponse(
            found=False,
            feature=feature,
            session=session,
            horizon=horizon,
            message=(
                "No published result for this feature/session/horizon "
                "combination. Missing values are never interpolated."
            ),
        )

    return ExperimentResponse(
        feature=feature,
        feature_label=data.SIGNAL_LABELS[feature],
        session=session,
        session_id=res["session_id"],
        horizon=horizon,
        statistic=statistic,
        inference=inference,
        n_obs=res["n_obs"],
        spearman_ic=res["spearman_ic"],
        pearson_ic=res["pearson_ic"],
        dir_acc=res["dir_acc"],
        ic_ci_low=res["ic_ci_low"],
        ic_ci_high=res["ic_ci_high"],
        hac_t_stat=res["hac_t_stat"],
        p_value=res["p_value"],
        fdr_p_value=res["fdr_p_value"],
        fdr_significant=res["fdr_significant"],
        inference_notes={
            "naive": (
                "Point estimates as published in results/session_results.csv "
                "(no uncertainty correction)."
            ),
            "bootstrap": (
                "95% confidence interval from the stationary block bootstrap "
                "(block size 100) published in session_results.csv."
            ),
            "hac": (
                "HAC (Newey-West) OLS t-statistic and raw two-sided p-value "
                "from results/multiple_testing.csv."
            ),
            "fdr": (
                "Benjamini-Hochberg adjusted p-value and significance flag "
                "from results/multiple_testing.csv (54 signal x horizon tests)."
            ),
        },
        source_files=[
            "results/session_results.csv",
            "results/multiple_testing.csv",
        ],
        note=(
            "All values served verbatim from generated research outputs. "
            "Missing fields (null) are not published for this selection and "
            "are never interpolated."
        ),
    )


@router.get("/provenance", response_model=None)
def get_provenance() -> dict:
    """Vendoring provenance for the reproducibility panel (static facts)."""
    return {
        "upstream_repository": (
            "https://github.com/RK-cyber5/order-book-microstructure-research"
        ),
        "upstream_commit": "baa51bf6682d1bbe7c33d4de240fd2dece2080ee",
        "upstream_commit_date": "2026-09-14",
        "vendored": "2026-09-22",
        "vendoring": (
            "research/, results/, analytics/ vendored unmodified "
            "(byte-identical, verified with diff -r)"
        ),
        "upstream_contribution": (
            "Upstream framework: the LOB research pipeline — L2 event "
            "reconstruction, feature computation, event-time statistics, "
            "inference, and execution modeling — plus its generated outputs."
        ),
        "this_project_contribution": (
            "This project: the interactive browser-based research terminal, "
            "the research API service, and clearly-labeled deterministic "
            "reconstructed/illustrative visualizations."
        ),
        "data_availability": (
            "Raw event-level L2 data is NOT published with the repository; "
            "published statistical research outputs ARE real."
        ),
    }


@router.get("/generalization", response_model=GeneralizationResponse)
def get_generalization() -> GeneralizationResponse:
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
    return GeneralizationResponse(
        sessions=sessions,
        feature_shift=[FeatureShiftRow(**r) for r in data.feature_shift_rows()],
        cross_session=[CrossSessionRow(**r) for r in data.cross_session_rows()],
        note=(
            "Cross-session generalization: Session 1 (train/development) vs "
            "Session 2 (unseen/out-of-sample). Feature distribution shift "
            "from results/feature_shift.csv; train/test IC with 95% "
            "bootstrap CIs from results/horizon_analysis.csv."
        ),
        shift_disclaimer=(
            "OBSERVED DISTRIBUTION SHIFT — NOT A CAUSAL CLAIM. The sessions "
            "differ in spread regime and feature distributions; the data "
            "does not establish that spread differences caused the signal "
            "decay."
        ),
        source_files=[
            "results/feature_shift.csv",
            "results/horizon_analysis.csv",
            "results/session_forensics.csv",
        ],
    )


@router.get("/execution-grid", response_model=ExecutionGridResponse)
def get_execution_grid() -> ExecutionGridResponse:
    grid = data.execution_grid()
    return ExecutionGridResponse(
        sessions={
            k: ExecutionGridSession(**v) for k, v in grid["sessions"].items()
        },
        per_signal=[ExecutionGridSignal(**s) for s in grid["per_signal"]],
        model=(
            "Modeled aggressive taker execution: net = gross(latency) - "
            "cost_multiplier x base spread cost. Gross-vs-latency from "
            "results/session_latency.csv; base cost and multiplier grid "
            "from results/session_cost_sensitivity.csv. Grid values "
            "coincide with published rows at every intersection."
        ),
        statement=(
            "Gross signal effects were substantially smaller than the "
            "modeled spread and latency costs under the tested aggressive "
            "execution assumptions."
        ),
        caveat=(
            "MODELED EXECUTION — NOT LIVE TRADING. No live trading was "
            "performed and no profitability claim is made; passive "
            "execution was not evaluated."
        ),
        provenance=(
            "Research visualization of modeled assumptions. Surface values "
            "between published grid points follow the published linear "
            "cost model; they are model output, not measured trading "
            "results."
        ),
        source_files=[
            "results/session_latency.csv",
            "results/session_cost_sensitivity.csv",
            "results/cost_analysis.csv",
        ],
    )
