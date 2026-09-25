"""Load-once, read-only data access layer.

Everything is resolved relative to the service root. The vendored research
outputs under ``research_layer/`` are the SOURCE OF TRUTH and are never
modified; this module only READS them (pandas/CSV + JSON) and caches the
parsed forms in memory as module-level lazy singletons.

The single exception to "no synthetic data" is the illustrative signal-space
point field (numpy, seed 42), generated once at startup and clearly labeled.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional

import numpy as np
import pandas as pd

SERVICE_ROOT = Path(__file__).resolve().parents[1]
RESEARCH_LAYER = SERVICE_ROOT
RESULTS_DIR = RESEARCH_LAYER / "results"
DATA_STORE = SERVICE_ROOT / "data_store"

# Event-time horizons evaluated by the study (exactly the horizons present
# in results/session_results.csv).
HORIZONS: list[int] = [1, 2, 5, 10, 20, 50, 100, 250, 500]

# Display labels for the six research features.
SIGNAL_LABELS: dict[str, str] = {
    "l1_imb": "L1 Imbalance",
    "l5_imb_1k": "L5 Imbalance (1/k)",
    "l5_imb_uni": "L5 Imbalance (uniform)",
    "microprice_dev": "Microprice Deviation",
    "ofi": "Order Flow Imbalance (OFI)",
    "rel_spread": "Relative Spread",
}

SIGNAL_ORDER: list[str] = [
    "l1_imb",
    "l5_imb_1k",
    "l5_imb_uni",
    "microprice_dev",
    "ofi",
    "rel_spread",
]


# --------------------------------------------------------------------------- #
# Loaders (lazy module-level singletons)
# --------------------------------------------------------------------------- #
@lru_cache(maxsize=1)
def session_results() -> pd.DataFrame:
    """results/session_results.csv — per session/signal/horizon Spearman IC."""
    return pd.read_csv(RESULTS_DIR / "session_results.csv")


@lru_cache(maxsize=1)
def cost_analysis() -> pd.DataFrame:
    """results/cost_analysis.csv — gross/net bps per signal and latency."""
    return pd.read_csv(RESULTS_DIR / "cost_analysis.csv")


@lru_cache(maxsize=1)
def session_latency() -> pd.DataFrame:
    """results/session_latency.csv — IC and gross bps vs latency, per session."""
    return pd.read_csv(RESULTS_DIR / "session_latency.csv")


@lru_cache(maxsize=1)
def sanity_null() -> pd.DataFrame:
    """results/sanity_null.csv — shuffled-target placebo regression stats."""
    return pd.read_csv(RESULTS_DIR / "sanity_null.csv")


@lru_cache(maxsize=1)
def multiple_testing() -> pd.DataFrame:
    """results/multiple_testing.csv — Benjamini-Hochberg FDR results."""
    return pd.read_csv(RESULTS_DIR / "multiple_testing.csv")


@lru_cache(maxsize=1)
def session_forensics() -> pd.DataFrame:
    """results/session_forensics.csv — raw spread/duration forensics."""
    return pd.read_csv(RESULTS_DIR / "session_forensics.csv")


@lru_cache(maxsize=1)
def feature_shift() -> pd.DataFrame:
    """results/feature_shift.csv — per-feature distribution shift statistics."""
    return pd.read_csv(RESULTS_DIR / "feature_shift.csv")


@lru_cache(maxsize=1)
def horizon_analysis() -> pd.DataFrame:
    """results/horizon_analysis.csv — cross-session train/test IC with CIs."""
    return pd.read_csv(RESULTS_DIR / "horizon_analysis.csv")


@lru_cache(maxsize=1)
def session_cost_sensitivity() -> pd.DataFrame:
    """results/session_cost_sensitivity.csv — modeled cost multiplier grid."""
    return pd.read_csv(RESULTS_DIR / "session_cost_sensitivity.csv")


@lru_cache(maxsize=1)
def dataset_inventory() -> pd.DataFrame:
    """results/dataset_inventory.csv — per-session source inventory."""
    return pd.read_csv(RESULTS_DIR / "dataset_inventory.csv")


@lru_cache(maxsize=1)
def manifest() -> dict[str, Any]:
    """results/experiment_manifest.json — served verbatim."""
    with open(RESULTS_DIR / "experiment_manifest.json", "r", encoding="utf-8") as fh:
        return json.load(fh)


@lru_cache(maxsize=1)
def verified_metrics() -> dict[str, Any]:
    """data_store/verified_metrics.json — faithful transcription of the
    headline values published in research/report.md and
    research/executive_summary.md."""
    with open(DATA_STORE / "verified_metrics.json", "r", encoding="utf-8") as fh:
        return json.load(fh)


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _round_or_none(value: Any, digits: int) -> Optional[float]:
    """Round a float; map NaN/missing to None."""
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    return round(float(value), digits)


def fdr_significant_count() -> int:
    """Count of rows in multiple_testing.csv with significant == True."""
    mt = multiple_testing()
    if mt.empty or "significant" not in mt.columns:
        return 0
    return int(mt["significant"].sum())


def l1_imb_curve(session_id: str) -> list[dict[str, float]]:
    """Real per-horizon Spearman IC for signal l1_imb in a given session."""
    df = session_results()
    rows = df[(df["session_id"] == session_id) & (df["signal"] == "l1_imb")]
    rows = rows.sort_values("horizon")
    return [
        {"horizon": int(r.horizon), "ic": round(float(r.spearman_ic), 4)}
        for r in rows.itertuples()
    ]


def signal_decay_points(session_id: str, signal: str) -> list[dict[str, Any]]:
    """{horizon, ic, n_obs} points for one session/signal, sorted by horizon."""
    df = session_results()
    rows = df[(df["session_id"] == session_id) & (df["signal"] == signal)]
    rows = rows.sort_values("horizon")
    return [
        {
            "horizon": int(r.horizon),
            "ic": round(float(r.spearman_ic), 4),
            "n_obs": int(r.n_obs),
        }
        for r in rows.itertuples()
    ]


def session_forensics_row(session_id: str) -> dict[str, Optional[float]]:
    """Raw median spread (price units) and session duration, per session."""
    df = session_forensics()
    rows = df[df["session"] == session_id]
    if rows.empty:
        return {"median_spread": None, "duration_sec": None}
    row = rows.iloc[0]
    return {
        "median_spread": _round_or_none(row["median_spread"], 4),
        "duration_sec": _round_or_none(row["duration_sec"], 3),
    }


def latency_curve(session_id: str) -> list[dict[str, Any]]:
    """Latency curve rows for a session: gross bps and IC (NaN → None)."""
    df = session_latency()
    rows = df[df["session"] == session_id].sort_values("latency")
    out: list[dict[str, Any]] = []
    for r in rows.itertuples():
        out.append(
            {
                "latency_events": int(r.latency),
                "gross_bps": _round_or_none(r.gross_bps, 4),
                "ic": _round_or_none(r.ic, 4),
            }
        )
    return out


def cost_by_signal_rows() -> list[dict[str, Any]]:
    """Per-signal cost table at zero added latency (gross/net bps)."""
    df = cost_analysis()
    out: list[dict[str, Any]] = []
    for r in df.itertuples():
        out.append(
            {
                "signal": str(r.signal),
                "n_trades": int(r.N_trades),
                "gross_lat_0_bps": _round_or_none(r.gross_lat_0_bps, 4),
                "net_lat_0_bps": _round_or_none(r.net_lat_0_bps, 2),
            }
        )
    return out


def sanity_null_row() -> dict[str, Any]:
    """Shuffled-target null statistics (single row CSV)."""
    df = sanity_null()
    row = df.iloc[0]
    return {
        "n": int(row["N"]),
        "spearman_ic": _round_or_none(row["spearman_ic"], 4),
        "p_value_hac": _round_or_none(row["p_value_hac"], 4),
    }


# --------------------------------------------------------------------------- #
# Illustrative signal-space point field — the ONLY synthetic data served.
# Deterministic (numpy default_rng seed 42), generated once, cached.
# --------------------------------------------------------------------------- #
@lru_cache(maxsize=1)
def signal_space_points() -> list[dict[str, float]]:
    rng = np.random.default_rng(42)
    n = 1200
    a = rng.standard_normal(n)
    b = rng.standard_normal(n)
    c = rng.standard_normal(n)
    d = rng.standard_normal(n)
    e = rng.standard_normal(n)
    f = rng.standard_normal(n)  # noqa: F841  (drawn per recipe; unused below)

    l1 = np.clip(0.62 * a + 0.38 * b, -1.0, 1.0)
    l5 = np.clip(0.70 * a + 0.30 * c, -1.0, 1.0)
    microprice = np.clip(0.55 * b + 0.45 * c, -1.0, 1.0)
    ofi = np.clip(0.45 * a + 0.25 * b + 0.85 * d, -1.0, 1.0)  # heavier tails
    ret = np.clip(
        0.42 * l1 + 0.18 * l5 + 0.12 * microprice + 0.20 * ofi + 0.55 * e,
        -1.0,
        1.0,
    )

    return [
        {
            "l1": round(float(p_l1), 4),
            "l5": round(float(p_l5), 4),
            "microprice": round(float(p_mp), 4),
            "ofi": round(float(p_ofi), 4),
            "ret": round(float(p_ret), 4),
        }
        for p_l1, p_l5, p_mp, p_ofi, p_ret in zip(l1, l5, microprice, ofi, ret)
    ]


# --------------------------------------------------------------------------- #
# Experiment lookup — real per feature/session/horizon published results
# (session_results.csv + multiple_testing.csv). Nothing is interpolated.
# --------------------------------------------------------------------------- #
def experiment_result(
    feature: str, session: int, horizon: int
) -> Optional[dict[str, Any]]:
    """One published (feature, session, horizon) row, joined with its
    multiple-testing (HAC / FDR) row when present. Returns None when the
    combination has no published result."""
    sess_id = f"Session_{session}"
    df = session_results()
    row = df[
        (df["session_id"] == sess_id)
        & (df["signal"] == feature)
        & (df["horizon"] == horizon)
    ]
    if row.empty:
        return None
    r = row.iloc[0]

    mt = multiple_testing()
    mrow = mt[(mt["signal"] == feature) & (mt["horizon"] == horizon)]
    if mrow.empty:
        t_stat = p_raw = p_fdr = None
        fdr_sig: Optional[bool] = None
    else:
        m = mrow.iloc[0]
        t_stat = _round_or_none(m["t_stat"], 4)
        p_raw = _round_or_none(m["raw_p_value"], 4)
        p_fdr = _round_or_none(m["fdr_p_value"], 4)
        fdr_sig = bool(m["significant"]) if not pd.isna(m["significant"]) else None

    return {
        "session_id": sess_id,
        "n_obs": int(r["n_obs"]),
        "spearman_ic": _round_or_none(r["spearman_ic"], 4),
        "pearson_ic": _round_or_none(r["pearson_ic"], 4),
        "dir_acc": _round_or_none(r["dir_acc"], 4),
        # 95% CI from the stationary block bootstrap (block 100) used upstream.
        "ic_ci_low": _round_or_none(r["ci_low"], 4),
        "ic_ci_high": _round_or_none(r["ci_high"], 4),
        "hac_t_stat": t_stat,
        "p_value": p_raw,
        "fdr_p_value": p_fdr,
        "fdr_significant": fdr_sig,
    }


def experiment_features() -> list[str]:
    """Signals with published per-session results (session_results.csv)."""
    return sorted(session_results()["signal"].unique().tolist())


# --------------------------------------------------------------------------- #
# Generalization — feature_shift.csv + horizon_analysis.csv (both sessions)
# --------------------------------------------------------------------------- #
def feature_shift_rows() -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for r in feature_shift().itertuples():
        out.append(
            {
                "feature": str(r.feature),
                "s1_mean": _round_or_none(r.s1_mean, 4),
                "s2_mean": _round_or_none(r.s2_mean, 4),
                "s1_std": _round_or_none(r.s1_std, 4),
                "s2_std": _round_or_none(r.s2_std, 4),
                "ks_stat": _round_or_none(r.ks_stat, 4),
                "ks_pval": _round_or_none(r.ks_pval, 6),
            }
        )
    return out


def cross_session_rows() -> list[dict[str, Any]]:
    """Cross-session train(1)/test(2) IC rows with CIs, per feature/horizon."""
    out: list[dict[str, Any]] = []
    df = horizon_analysis().sort_values(["signal", "horizon"])
    for r in df.itertuples():
        out.append(
            {
                "feature": str(r.signal),
                "horizon": int(r.horizon),
                "eval_type": str(r.eval_type),
                "train_n": int(r.train_n),
                "test_n": int(r.test_n),
                "train_spearman": _round_or_none(r.train_spearman, 4),
                "train_ci_low": _round_or_none(r.train_ci_low, 4),
                "train_ci_high": _round_or_none(r.train_ci_high, 4),
                "test_spearman": _round_or_none(r.test_spearman, 4),
                "test_ci_low": _round_or_none(r.test_ci_low, 4),
                "test_ci_high": _round_or_none(r.test_ci_high, 4),
            }
        )
    return out


# --------------------------------------------------------------------------- #
# Execution grid — modeled latency x cost-multiplier surface, derived exactly
# from the published latency curves (session_latency.csv) and the cost
# sensitivity model (session_cost_sensitivity.csv): net = gross(latency) -
# multiplier * base_cost. Values coincide with published rows at every grid
# intersection; the surface between them follows the same linear cost model
# the published sensitivity analysis uses.
# --------------------------------------------------------------------------- #
def execution_grid() -> dict[str, Any]:
    sens = session_cost_sensitivity()
    lat = session_latency()
    out_sessions: dict[str, Any] = {}
    for sess_id in ["Session_1", "Session_2"]:
        rows = lat[lat["session"] == sess_id].sort_values("latency")
        latencies = [int(v) for v in rows["latency"].tolist()]
        gross = [_round_or_none(v, 4) for v in rows["gross_bps"].tolist()]
        ic_curve = [_round_or_none(v, 4) for v in rows["ic"].tolist()]
        srows = sens[sens["session"] == sess_id].sort_values("cost_multiplier")
        multipliers = [float(v) for v in srows["cost_multiplier"].tolist()]
        base_rows = srows[srows["cost_multiplier"] == 1.0]
        base_cost = (
            float(base_rows.iloc[0]["cost_bps"]) if not base_rows.empty else None
        )
        grid: list[list[Optional[float]]] = []
        for g in gross:
            row: list[Optional[float]] = []
            for m in multipliers:
                if g is None or base_cost is None:
                    row.append(None)
                else:
                    row.append(round(g - m * base_cost, 4))
            grid.append(row)
        out_sessions[sess_id] = {
            "latencies_events": latencies,
            "gross_bps": gross,
            "ic": ic_curve,
            "cost_multipliers": multipliers,
            "base_cost_bps": _round_or_none(base_cost, 4),
            "net_bps_grid": grid,
        }

    per_signal: list[dict[str, Any]] = []
    ca = cost_analysis()
    # Base cost for the per-signal table: unseen-session aggressive taker cost
    s2_base = out_sessions["Session_2"]["base_cost_bps"]
    s2_mults = out_sessions["Session_2"]["cost_multipliers"]
    s2_lats = out_sessions["Session_2"]["latencies_events"]
    for r in ca.itertuples():
        signal = str(r.signal)
        gross_by_latency = {
            "0": _round_or_none(r.gross_lat_0_bps, 4),
            "1": _round_or_none(r.gross_lat_1_bps, 4),
            "2": _round_or_none(r.gross_lat_2_bps, 4),
            "5": _round_or_none(r.gross_lat_5_bps, 4),
            "10": _round_or_none(r.gross_lat_10_bps, 4),
        }
        # Server-side modeled net grid for this signal: gross(latency) -
        # multiplier * base cost (same published linear cost model).
        sig_grid: list[list[Optional[float]]] = []
        for lat in s2_lats:
            g = gross_by_latency.get(str(lat))
            row: list[Optional[float]] = []
            for m in s2_mults:
                if g is None or s2_base is None:
                    row.append(None)
                else:
                    row.append(round(g - m * s2_base, 4))
            sig_grid.append(row)
        per_signal.append(
            {
                "signal": signal,
                "n_trades": int(r.N_trades),
                "gross_bps_by_latency": gross_by_latency,
                "base_cost_bps": s2_base,
                "latencies_events": s2_lats,
                "cost_multipliers": s2_mults,
                "net_bps_grid": sig_grid,
            }
        )
    return {"sessions": out_sessions, "per_signal": per_signal}


# --------------------------------------------------------------------------- #
# Deterministic reconstructed order-book series (REPLAY) — the second and
# last synthetic data exception, clearly labeled in every response.
#
# Raw event-level L2 data is NOT published with the repository. This is a
# deterministic reconstruction (numpy default_rng, fixed per-session seed,
# generated once and cached) calibrated to published research outputs:
#   - median raw spread + mean relative spread  -> spread level & base price
#   - session duration                          -> derived event-time clock
#   - OFI mean/std (session_forensics.csv)      -> OFI process
#   - median depth (session_forensics.csv)      -> level size scale
#   - L1 IC @ 10 events                         -> imbalance/return coupling
# No wall-clock time, no unseeded randomness: identical output every call.
# --------------------------------------------------------------------------- #
REPLAY_N_EVENTS = 2000
REPLAY_LEVELS = 10


def _replay_params(session: int) -> dict[str, Any]:
    vm = verified_metrics()
    s = vm["sessions"][session - 1]
    forensics = session_forensics_row(f"Session_{session}")
    median_spread_raw = float(forensics["median_spread"] or 40.0)
    mean_rel_bps = float(s["mean_relative_spread_bps"])
    base_price = median_spread_raw / (mean_rel_bps / 1e4)
    duration_sec = float(forensics["duration_sec"] or 0.0)
    fr = session_forensics()
    row = fr[fr["session"] == f"Session_{session}"].iloc[0]
    return {
        "seed": 4200 + session,
        "label": s["label"],
        "role": s["role"],
        "valid_l2_states": int(s["valid_l2_states"]),
        "l1_ic_at_10": float(s["l1_ic_at_10_events"]),
        "median_spread_raw": median_spread_raw,
        "mean_relative_spread_bps": mean_rel_bps,
        "base_price": round(base_price, 2),
        "duration_sec": duration_sec,
        "ofi_mean": float(row["ofi_mean"]),
        "ofi_std": float(row["ofi_std"]),
        "median_depth_bid": float(row["median_depth_bid"]),
    }


@lru_cache(maxsize=2)
def replay_series(session: int) -> dict[str, Any]:
    """Deterministic reconstructed book series for one session.

    Returns the full cached series (metrics + 10-level depth per event).
    Endpoints slice windows / strided timelines from it; clients never get
    the whole array in one response.
    """
    p = _replay_params(session)
    rng = np.random.default_rng(p["seed"])
    n = REPLAY_N_EVENTS

    # --- L1 imbalance: mean-reverting AR(1), clipped. ---------------------- #
    imb = np.empty(n)
    x = 0.1
    for i in range(n):
        x = x * 0.88 + rng.normal(0, 0.16)
        x = float(np.clip(x, -0.9, 0.9))
        imb[i] = x
    sigma_i = float(np.std(imb))

    # --- 10-event-ahead return coupled to imbalance with the published IC. - #
    # rho = beta*sigma_i / sqrt(beta^2 sigma_i^2 + sigma_e^2)  =>  beta for rho
    rho = p["l1_ic_at_10"]
    sigma_e = 1.0
    beta = rho * sigma_e / (np.sqrt(max(1e-9, 1 - rho * rho)) * sigma_i)
    r10 = beta * imb + rng.normal(0, sigma_e, n)

    # Per-event mid log-return: 10-event return spread across 10 events,
    # scaled so the typical 10-event move is ~1.2x the relative spread.
    target_10_move = 1.2 * (p["mean_relative_spread_bps"] / 1e4)
    scale = target_10_move / max(1e-9, float(np.std(r10)))
    per_event_ret = (r10 / 10.0) * scale
    mid = p["base_price"] * np.exp(np.cumsum(per_event_ret))

    # --- Spread: mean-reverting log-normal around the published median. ---- #
    log_s = np.empty(n)
    ls = np.log(p["median_spread_raw"])
    for i in range(n):
        ls = ls + 0.06 * (np.log(p["median_spread_raw"]) - ls) + rng.normal(0, 0.18)
        log_s[i] = ls
    spread = np.exp(log_s)
    spread = spread * (p["median_spread_raw"] / float(np.mean(spread)))

    # --- OFI: AR(1) calibrated to published mean/std. ----------------------- #
    ofi = np.empty(n)
    target_std = max(1e-6, p["ofi_std"])
    ar = 0.55
    o = p["ofi_mean"]
    for i in range(n):
        o = p["ofi_mean"] + ar * (o - p["ofi_mean"]) + rng.normal(0, target_std * 0.6)
        o = float(np.clip(o, p["ofi_mean"] - 4 * target_std, p["ofi_mean"] + 4 * target_std))
        ofi[i] = o

    # --- Depth levels (10/side) with imbalance tilt. ------------------------ #
    depth_scale = max(1e-4, p["median_depth_bid"])
    profile = np.array([1.0 + 0.34 * k for k in range(REPLAY_LEVELS)])
    level_gap = spread * 0.16

    events: list[dict[str, Any]] = []
    for i in range(n):
        m = float(mid[i])
        sp = float(spread[i])
        gap = float(level_gap[i])
        best_bid = m - sp / 2.0
        best_ask = m + sp / 2.0
        tilt = 1.0 + 0.5 * float(imb[i])
        bids: list[dict[str, float]] = []
        asks: list[dict[str, float]] = []
        for k in range(REPLAY_LEVELS):
            b_sz = depth_scale * float(profile[k]) * tilt * float(rng.lognormal(0, 0.45))
            a_sz = depth_scale * float(profile[k]) * (2.0 - tilt) * float(rng.lognormal(0, 0.45))
            bids.append(
                {
                    "price": round(best_bid - k * gap, 2),
                    "size": round(b_sz, 3),
                }
            )
            asks.append(
                {
                    "price": round(best_ask + k * gap, 2),
                    "size": round(a_sz, 3),
                }
            )
        b0 = bids[0]["size"]
        a0 = asks[0]["size"]
        l1 = (b0 - a0) / max(1e-9, b0 + a0)
        micro = m + (sp / 2.0) * l1
        events.append(
            {
                "i": i,
                "mid": round(m, 2),
                "spread": round(sp, 2),
                "spread_bps": round(sp / m * 1e4, 3),
                "l1_imbalance": round(float(l1), 4),
                "microprice": round(float(micro), 2),
                "ofi": round(float(ofi[i]), 5),
                "t_event_sec": round(i * (p["duration_sec"] / max(1, n - 1)), 2),
                "bids": bids,
                "asks": asks,
            }
        )

    return {"params": p, "events": events}


def replay_params_public(session: int) -> dict[str, Any]:
    p = dict(_replay_params(session))
    return {
        "session": session,
        "label": p["label"],
        "role": p["role"],
        "valid_l2_states": p["valid_l2_states"],
        "replay_events": REPLAY_N_EVENTS,
        "levels_per_side": REPLAY_LEVELS,
        "seed": p["seed"],
        "calibration": {
            "l1_ic_at_10_events": p["l1_ic_at_10"],
            "median_spread_raw": p["median_spread_raw"],
            "mean_relative_spread_bps": p["mean_relative_spread_bps"],
            "base_price": p["base_price"],
            "session_duration_sec": round(p["duration_sec"], 1),
            "ofi_mean": round(p["ofi_mean"], 5),
            "ofi_std": round(p["ofi_std"], 5),
            "median_depth_bid": p["median_depth_bid"],
        },
    }


def warm_cache() -> None:
    """Eagerly load every dataset at startup so failures surface immediately."""
    session_results()
    cost_analysis()
    session_latency()
    sanity_null()
    multiple_testing()
    session_forensics()
    manifest()
    verified_metrics()
    signal_space_points()
    feature_shift()
    horizon_analysis()
    session_cost_sensitivity()
    dataset_inventory()
    execution_grid()
    replay_series(1)
    replay_series(2)
