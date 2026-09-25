"""Pydantic v2 response models for every research-api endpoint.

All models are populated manually in the routers (no ORM objects), so
``from_attributes`` is not needed; typing is strict throughout.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict


# --------------------------------------------------------------------------- #
# /api/health
# --------------------------------------------------------------------------- #
class HealthResponse(BaseModel):
    status: str
    service: str
    dataset: str
    valid_l2_states: int
    sessions: int


# --------------------------------------------------------------------------- #
# /api/research/summary
# --------------------------------------------------------------------------- #
class SummaryResponse(BaseModel):
    symbol: str
    venue: str
    total_l2_states: int
    sessions_count: int
    market_time_hours: float
    unseen_l1_ic_at_10_events: float
    unseen_l1_ic_description: str
    in_sample_l1_ic_at_10_events: float
    fdr_significant_findings: int
    fdr_note: str
    data_note: str
    source_files: list[str]


# --------------------------------------------------------------------------- #
# /api/research/sessions
# --------------------------------------------------------------------------- #
class SessionCurvePoint(BaseModel):
    horizon: int
    ic: float


class SessionResponse(BaseModel):
    id: str
    label: str
    role: str
    role_short: str
    valid_l2_states: int
    time_span_hours: float
    mean_relative_spread_bps: float
    l1_ic_at_10_events: float
    l1_ic_curve: list[SessionCurvePoint]
    median_spread_raw: float
    median_spread: float
    duration_sec: float


class SessionsResponse(BaseModel):
    sessions: list[SessionResponse]


# --------------------------------------------------------------------------- #
# /api/research/signal-decay
# --------------------------------------------------------------------------- #
class SignalDecayPoint(BaseModel):
    horizon: int
    ic: float
    n_obs: int


class SignalDecayFeature(BaseModel):
    key: str
    label: str
    session_1: list[SignalDecayPoint]
    session_2: list[SignalDecayPoint]


class SignalDecayResponse(BaseModel):
    features: list[SignalDecayFeature]
    horizons_events: list[int]
    note: str


# --------------------------------------------------------------------------- #
# /api/research/methodology
# --------------------------------------------------------------------------- #
class FeatureInfo(BaseModel):
    key: str
    label: str


class SanityNullInfo(BaseModel):
    n: int
    spearman_ic: float
    p_value_hac: float
    description: str


class PipelineStage(BaseModel):
    stage: str
    description: str


class MethodologyResponse(BaseModel):
    features: list[FeatureInfo]
    horizons_events: list[int]
    split_method: str
    inference_method: str
    bootstrap_method: str
    bootstrap_block_size: int
    fdr_method: str
    cost_assumptions: str
    latency_assumptions_events: list[int]
    random_seed: int
    sanity_null: SanityNullInfo
    pipeline: list[PipelineStage]


# --------------------------------------------------------------------------- #
# /api/research/execution
# --------------------------------------------------------------------------- #
class ExecutionSession(BaseModel):
    gross_bps: float
    spread_cost_bps: float
    net_bps: float


class LatencyPoint(BaseModel):
    latency_events: int
    gross_bps: float
    ic: Optional[float] = None


class CostBySignal(BaseModel):
    signal: str
    n_trades: int
    gross_lat_0_bps: float
    net_lat_0_bps: float


class ExecutionResponse(BaseModel):
    flow: list[str]
    session_1: ExecutionSession
    latency_curve_session_1: list[LatencyPoint]
    cost_by_signal: list[CostBySignal]
    statement: str
    caveat: str


# --------------------------------------------------------------------------- #
# /api/research/manifest  (experiment_manifest.json, served verbatim)
# --------------------------------------------------------------------------- #
class ManifestResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    dataset_identifiers: list[str]
    date_session_information: str
    features: list[str]
    horizons_events: list[int]
    split_method: str
    inference_method: str
    bootstrap_method: str
    block_size: int
    fdr_method: str
    cost_assumptions: str
    latency_assumptions_events: list[int]
    random_seeds: int


# --------------------------------------------------------------------------- #
# /api/research/illustrative/signal-space  (ONLY synthetic endpoint)
# --------------------------------------------------------------------------- #
class SignalSpacePoint(BaseModel):
    l1: float
    l5: float
    microprice: float
    ofi: float
    ret: float


class SignalSpaceResponse(BaseModel):
    note: str
    n_points: int
    points: list[SignalSpacePoint]


# --------------------------------------------------------------------------- #
# /api/research/replay — deterministic reconstructed L2 book (ILLUSTRATIVE)
# --------------------------------------------------------------------------- #
class ReplayLevel(BaseModel):
    price: float
    size: float


class ReplayEvent(BaseModel):
    i: int
    mid: float
    spread: float
    spread_bps: float
    l1_imbalance: float
    microprice: float
    ofi: float
    t_event_sec: float
    bids: list[ReplayLevel]
    asks: list[ReplayLevel]


class ReplayTimelinePoint(BaseModel):
    """Strided metric-only sample for the event-time timeline tracks."""
    i: int
    mid: float
    spread_bps: float
    l1_imbalance: float
    ofi: float


class ReplayCalibration(BaseModel):
    l1_ic_at_10_events: float
    median_spread_raw: float
    mean_relative_spread_bps: float
    base_price: float
    session_duration_sec: float
    ofi_mean: float
    ofi_std: float
    median_depth_bid: float


class ReplayMeta(BaseModel):
    session: int
    label: str
    role: str
    valid_l2_states: int
    replay_events: int
    levels_per_side: int
    seed: int
    calibration: ReplayCalibration


class ReplayWindowResponse(BaseModel):
    mode: str  # "window"
    meta: ReplayMeta
    from_index: int
    to_index: int
    events: list[ReplayEvent]
    provenance: str
    note: str


class ReplayTimelineResponse(BaseModel):
    mode: str  # "timeline"
    meta: ReplayMeta
    stride: int
    points: list[ReplayTimelinePoint]
    provenance: str
    note: str


# --------------------------------------------------------------------------- #
# /api/research/experiment — published result for one (feature, session,
# horizon) selection, joined with HAC / FDR fields where available.
# --------------------------------------------------------------------------- #
class ExperimentResponse(BaseModel):
    feature: str
    feature_label: str
    session: int
    session_id: str
    horizon: int
    statistic: str
    inference: str
    n_obs: int
    spearman_ic: Optional[float]
    pearson_ic: Optional[float]
    dir_acc: Optional[float]
    ic_ci_low: Optional[float]
    ic_ci_high: Optional[float]
    hac_t_stat: Optional[float]
    p_value: Optional[float]
    fdr_p_value: Optional[float]
    fdr_significant: Optional[bool]
    inference_notes: dict[str, str]
    source_files: list[str]
    note: str


class ExperimentMissingResponse(BaseModel):
    found: bool
    feature: str
    session: int
    horizon: int
    message: str


# --------------------------------------------------------------------------- #
# /api/research/generalization
# --------------------------------------------------------------------------- #
class FeatureShiftRow(BaseModel):
    feature: str
    s1_mean: Optional[float]
    s2_mean: Optional[float]
    s1_std: Optional[float]
    s2_std: Optional[float]
    ks_stat: Optional[float]
    ks_pval: Optional[float]


class CrossSessionRow(BaseModel):
    feature: str
    horizon: int
    eval_type: str
    train_n: int
    test_n: int
    train_spearman: Optional[float]
    train_ci_low: Optional[float]
    train_ci_high: Optional[float]
    test_spearman: Optional[float]
    test_ci_low: Optional[float]
    test_ci_high: Optional[float]


class GeneralizationResponse(BaseModel):
    sessions: list[SessionResponse]
    feature_shift: list[FeatureShiftRow]
    cross_session: list[CrossSessionRow]
    note: str
    shift_disclaimer: str
    source_files: list[str]


# --------------------------------------------------------------------------- #
# /api/research/execution-grid — modeled latency x cost surface
# --------------------------------------------------------------------------- #
class ExecutionGridSession(BaseModel):
    latencies_events: list[int]
    gross_bps: list[Optional[float]]
    ic: list[Optional[float]]
    cost_multipliers: list[float]
    base_cost_bps: Optional[float]
    net_bps_grid: list[list[Optional[float]]]


class ExecutionGridSignal(BaseModel):
    signal: str
    n_trades: int
    gross_bps_by_latency: dict[str, Optional[float]]
    base_cost_bps: Optional[float]
    latencies_events: list[int]
    cost_multipliers: list[float]
    net_bps_grid: list[list[Optional[float]]]


class ExecutionGridResponse(BaseModel):
    sessions: dict[str, ExecutionGridSession]
    per_signal: list[ExecutionGridSignal]
    model: str
    statement: str
    caveat: str
    provenance: str
    source_files: list[str]
