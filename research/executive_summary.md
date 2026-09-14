# Executive Summary

**1. Research Question**
Does Limit Order Book (LOB) imbalance and Order Flow Imbalance (OFI) incrementally predict short-term price moves, and does this predictability survive spread crossing and execution latency?

**2. Dataset Size and Coverage**
36,463 valid L2 order book updates spanning 1.86 hours of high-frequency BTCUSDT data on Binance US (Session 1), plus an additional 74,338 events spanning 1.0 hour (Session 2). The analysis uses rigorous **Cross-Session Walk-Forward validation** (Train on Session 1, Test on Session 2).

**3. Strongest Verified Result**
Finding that naive IID in-sample inference overstated the apparent strength of the relationship relative to dependence-aware analysis. While naive in-sample analysis produced a Spearman IC of approximately 0.36, the relationship did not replicate at the same magnitude in the unseen session (IC ~ 0.14 at the 10-event horizon). After overlapping dependence correction (HAC) and False Discovery Rate (FDR) control, the remaining effect was not statistically significant.

**4. Major Negative Finding**
Making the tested aggressive execution strategy economically unattractive under the modeled spread and latency assumptions. The measured gross effect (e.g., ~0.003 bps in Session 1) was entirely insufficient to offset the tested spread-crossing costs (~3.6 bps in Session 1).

**5. Information-Decay Conclusion**
Predictive accuracy decays rapidly. Directional accuracy and IC peak within 5-10 events and steadily degrade across the 500-event spectrum within the evaluated sample.

**6. Regime Conclusion**
Signal stability is heavily context-dependent. The order-book relationship failed to replicate at the same magnitude in the unseen session, which exhibited substantially wider spreads (10x wider) and different order-flow conditions.

**7. Cost Conclusion**
The observed effect was insufficient to overcome tested execution costs. The statistical predictability of the limit order book cannot be profitably executed using aggressive market orders under the tested assumptions.

**8. Main Limitation**
While upgraded from a single-session to a dual-session design, the timeframe remains limited to two separate hour-scale windows. These findings are limited to the evaluated BTCUSDT sessions and should not be interpreted as evidence of universal or persistent market behavior.

**9. What should be tested next**
Gather 3–6 months of tick data to evaluate true cross-session stationarity and explore passive-execution queue modeling rather than aggressive taker simulations.
