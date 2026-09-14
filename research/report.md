# Order-Book Imbalance & Short-Horizon Price Formation

## Abstract
This empirical microstructure study investigates the predictive power of limit order book (LOB) imbalances and order flow in high-frequency crypto markets (BTCUSDT). We reconstruct dynamic L2 state from diff events and evaluate statistical predictability, information decay, regime dependence, and economic viability. By strictly enforcing out-of-sample chronological splits, HAC standard errors, block bootstrapping, and FDR multiple-testing control, we observe that top-of-book imbalance is highly predictive statistically. However, the information decays rapidly and fails to overcome realistic aggressive execution costs.

## Research Question
Does LOB imbalance and order flow incrementally predict short-term price moves, and does this predictability survive spread crossing and execution latency?

## Related Microstructure Concepts
Limit order book (LOB) shape and order flow imbalance (OFI) are canonical indicators of price pressure. This project quantifies whether these relationships are merely statistically significant artifacts of passive queue dynamics or tradable, aggressive alpha.

## Data
The dataset comprises two distinct independent sessions for Binance US BTCUSDT:
- **Session 1 (Train/Discovery):** 36,463 valid L2 diff-depth events (~1.86 hours)
- **Session 2 (Unseen Validation):** 74,338 valid L2 diff-depth events (~1.0 hours)

This cross-session design tests whether signals discovered in one high-frequency period replicate in a distinct, temporally separated period.

## L2 Reconstruction
We reconstruct the LOB dynamically in Python from incremental `type=book` events. To handle missing initial snapshots, we implement a robust dynamic uncrossing mechanism: aggressive limit updates that cross the opposing best price automatically flush the stale resting levels.

## Feature Definitions
- **L1 Imbalance**: $(BidSz_1 - AskSz_1) / (BidSz_1 + AskSz_1)$
- **L5 Depth Imbalance**: Weighted sum of sizes up to Level 5, tested with $1/k$ and uniform weights.
- **OFI (Order Flow Imbalance)**: Event-based changes in best bid/ask prices and displayed quantities (Cont et al. 2014).
- **Microprice Deviation**: $(Microprice - Midprice) / Midprice$

## Experimental Design
We define future returns strictly in *event time* (1, 2, 5, 10, 20, 50, 100, 250, 500 book updates).

## Statistical Inference
High-frequency observations are dependent. We compute Newey-West (HAC) robust standard errors for OLS regressions to account for overlapping return windows, and employ block bootstrapping for correlation confidence intervals. 

## Multiple Testing
To account for testing multiple signals across multiple horizons, we apply the Benjamini-Hochberg False Discovery Rate (FDR) control procedure.

## Out-of-Sample Methodology
To combat limited single-session generalization, we evaluate signals using a strict **Cross-Session Walk-Forward validation**. 
- Feature thresholds, multiple-testing significance, and regime medians are exclusively fitted on Session 1 (Train).
- The parameters are frozen and applied sequentially to Session 2 (Test). 
This completely isolates the test fold from look-ahead bias and cross-contamination.

## Results
Naive in-sample analysis produced a Spearman IC of approximately 0.36 for L1 Imbalance. However, the order-book relationship failed to replicate at the same magnitude in the unseen session, which exhibited substantially wider spreads (~39.5 bps vs ~6.2 bps) and different order-flow conditions. In this unseen test segment, L1 imbalance reached a Spearman IC of approximately 0.14 at the 10-event horizon, subject to the study's short-sample limitation. After FDR control, no signals achieved statistical significance, finding that naive IID in-sample inference overstated the apparent strength of the relationship relative to dependence-aware analysis.

## Incremental Information
Using multivariate OLS with HAC standard errors, we evaluated whether adding OFI or L5 depth to a baseline L1 imbalance model increases explanatory power. Adding OFI provided marginal in-sample improvement to Adjusted $R^2$, but collinearity limits broad claims of orthogonal information in the evaluated sample.

## Execution Economics
Finding that, under the tested assumptions, the measured OOS predictive effect was insufficient to overcome aggressive spread-crossing costs. The tested aggressive execution strategy was economically unattractive under the modeled spread and latency assumptions (gross effect ~0.003 bps vs ~3.6 bps cost in Session 1). Delaying execution by even 5 events effectively eliminated the remaining gross effect.

## Conclusion
The results suggest that high-frequency LOB signals discovered in a dense-book regime may not replicate when the market shifts to a wide-spread, high-volatility regime. Furthermore, the observed effect was entirely insufficient to overcome transaction costs for an aggressive taker strategy. 

## Limitations
The dataset spans two short periods (~1.86 hours and ~1.0 hours). These findings are limited to the evaluated BTCUSDT sessions and should not be interpreted as evidence of universal or persistent market behavior.

## STATISTICAL PREDICTABILITY vs ECONOMIC EXECUTABILITY
A central thesis of this study is the decoupling of statistical predictability from economic executability. Even if a statistically predictive order-book signal exists, it may fail to produce positive trading returns due to the bid-ask spread and latency.

## Execution Costs
We modeled an aggressive taker execution (crossing the spread on entry and exit). The gross expected return of L1 imbalance at a 10-event horizon out-of-sample was approximately zero. The round-trip spread cost averaged ~6.4 bps, yielding a strictly negative net return of -6.4 bps. The measured gross effect was entirely insufficient to offset the tested spread-crossing execution costs.

## Latency
Simulating a 1-to-10 event delay between signal observation and market execution further degrades the already-negative net returns. The measured gross predictive effect deteriorated substantially under a 5-event execution delay.

## Null Tests
The implemented placebo test (shuffling the target variable) did not produce significant associations under the tested null construction, confirming the pipeline does not organically manufacture false positives.

## Exploratory Interpretation: Passive Execution
Given the structural negativity of aggressive execution, future research could explore passive execution. Imbalance signals could hypothetically be used to optimize passive queue placement or skew quotes to avoid adverse selection, rather than crossing the spread aggressively.

## Limitations
The dataset spans only 1.86 hours. Robust alpha research requires months of out-of-sample tick data to confirm stationarity.

## Discussion
Top-of-book and order flow imbalances are statistically powerful predictors of high-frequency price changes. However, this predictability primarily governs passive queue dynamics and market-maker quote updates. It is not economically viable as an aggressive, spread-crossing signal.

## Conclusion
Order-book imbalance exhibits short-horizon statistical predictability, but the measured effect decays rapidly, is latency-sensitive, and is insufficient to overcome aggressive execution costs. 

## Reproducibility
From the repository root:
```bash
.venv\Scripts\python.exe -m research.run_all
```

## Attribution
This research was built on top of the original open-source C++ `limit-order-book` matching engine, relying on its `parquet_export.csv` data generation and underlying metrics infrastructure.
