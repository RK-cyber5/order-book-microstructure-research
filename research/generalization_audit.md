# Generalization Audit (Phase 23)

## Previous Limitation
The study was previously limited to a single 1.86-hour timeframe, evaluating out-of-sample (OOS) performance strictly via a chronological train/test split within that same session.

## Data Used to Address It
Discovered an additional, independent session in the repository: `out/backtests/day17_hour/parquet_export.csv`. 
- **Session 1:** 36,463 valid L2 states (1.86 hours)
- **Session 2:** 74,338 valid L2 states (1.0 hour)

## Validation Design
Upgraded from a within-session split to a **Cross-Session Walk-Forward Validation**:
- **Train/Discovery Fold:** Session 1 (Feature parameters, regime median thresholds, dependencies)
- **Unseen Test Fold:** Session 2 (Strict out-of-sample chronological evaluation)

## What Improved
- **Model Integrity:** Regime medians (e.g., high/low spread) and relative thresholds are exclusively fit on Session 1 and strictly applied to Session 2, entirely preventing information leakage between distinct market events.
- **Robustness Measurement:** Now generating explicit cross-session aggregates (mean IC, median IC, IC standard deviation).

## What Remains Unresolved
The analysis remains limited to a single asset (BTCUSDT) over two distinct short timeframes. It cannot confirm macroeconomic stationarity across diverse market regimes (e.g., multi-month macro cycles) or across different instrument asset classes. Evaluating long-term persistence remains an exploratory threshold requiring months of tick data.
