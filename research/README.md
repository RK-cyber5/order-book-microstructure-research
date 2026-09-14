# Order-Book Imbalance & Short-Horizon Price Formation

## 1. Research Question
Investigate whether limit-order-book liquidity and order-flow imbalance contain statistically significant information about future short-horizon mid-price movements, how that information changes across event horizons and market regimes, and whether any predictive relationship survives realistic transaction costs.

## 2. Motivation
In high-frequency trading and market microstructure, the shape of the limit order book is often used to predict imminent price moves. This project rigorously quantifies these relationships to determine if the predictive power is merely a statistical artifact or if it is economically exploitable when accounting for the bid-ask spread.

## 3. Existing Infrastructure Attribution
This research builds directly upon the open-source C++ `limit-order-book` matching engine. The underlying market replay tool, binary parsers, and data ingestion pipeline provided by the original repository were critical to extracting the raw market events necessary for this analysis. 

## 4. New Research Contribution
This module (`research/`) adds an original quantitative research layer:
- Dynamic L2 depth reconstruction from incremental diff events in Python.
- Multi-level depth-weighted imbalance signaling.
- Event-time horizon sampling.
- Regime-based predictability analysis (volatility and spread regimes).
- Transaction cost analysis.

## 5. Dataset
The research uses a ~1.86 hour sample of high-frequency Binance US BTCUSDT events (`parquet_export.csv`), comprising 36,463 valid L2 order book updates.

## 6. Methodology
We reconstruct the limit order book dynamically and compute predictive signals at each book update. We then measure the correlation (Pearson and Spearman) and directional accuracy of these signals against future mid-price returns calculated in *event time* (1, 5, 10, 25, 50, and 100 book updates into the future). 

## 7. Mathematical Definitions
- **Midprice**: $M_t = \frac{Bid_t + Ask_t}{2}$
- **L1 Imbalance**: $I_{1,t} = \frac{BidSz_t - AskSz_t}{BidSz_t + AskSz_t}$
- **L5 Depth Imbalance**: $I_{5,t} = \frac{\sum_{k=1}^5 \frac{1}{k} BidSz_{k,t} - \sum_{k=1}^5 \frac{1}{k} AskSz_{k,t}}{\sum_{k=1}^5 \frac{1}{k} BidSz_{k,t} + \sum_{k=1}^5 \frac{1}{k} AskSz_{k,t}}$

## 8. Experiments
1. **Signal Construction**: Reconstruct L2 depth and compute signals.
2. **Horizon Decay**: Measure correlation at varying event horizons.
3. **Regime Analysis**: Split performance by median relative spread and volatility.
4. **Transaction Costs**: Measure net returns assuming spread crossing.

## 9. Results
- Top-of-book imbalance contains statistically significant predictive power for short-horizon returns (Spearman IC ~0.36 at 10 events).
- The predictive power decays slightly but rank correlation stays high, although mean directional return peaks and flattens quickly.
- When accounting for crossing the bid-ask spread (~3 bps), the economic value of the signal is entirely negative, confirming that while LOB imbalance is statistically predictive, it is not sufficiently profitable to overcome aggressive execution costs.

## 10. Limitations
- The dataset spans only 1.86 hours. Robust alpha research requires months of data.
- The weighting scheme for L5 imbalance was chosen heuristically ($1/k$) and not optimized.

## 11. Reproduction Instructions
From the root of the repository, using the existing `.venv`:
```bash
python -m research.run_all
```
Results will be generated in `results/` and `results/figures/`.

## 12. Future Work
- Evaluate the signal as an execution scheduler (passive fill probability) rather than an aggressive alpha.
- Train machine learning models (e.g., LightGBM) on the full L2 depth profile instead of a fixed weighted sum.
