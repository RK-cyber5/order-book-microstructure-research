# Adversarial Review / Interview Defense (Phase 21)

**1. Why do you use event time?**
Clock time in crypto microstructure is highly non-stationary; periods of intense volatility bunch together. Event time (updates to the L2 state) normalizes the information arrival rate, stabilizing the horizon for statistical regressions.

**2. Why are observations dependent?**
If we predict a 10-event return at time $t$, and then again at $t+1$, the return window from $t+1$ to $t+10$ overlaps by 9 events with the first prediction. This structural overlap violates the IID assumptions of standard OLS.

**3. Why HAC?**
Newey-West (HAC) standard errors explicitly correct the covariance matrix for this precise auto-correlated overlapping structure, preventing drastically inflated t-statistics.

**4. Why block bootstrap?**
Standard bootstrapping breaks serial dependence. Stationary block bootstrapping preserves the local chronological structure, allowing us to estimate valid confidence intervals for rank correlations in dependent time series.

**5. Why FDR?**
We test multiple signals across multiple horizons and regimes. Without Benjamini-Hochberg False Discovery Rate control, we would mathematically guarantee false positives (Type I errors) simply by rolling the dice enough times.

**6. What constitutes OOS here?**
A completely disjoint session occurring chronologically later, strictly evaluated without refitting parameters. 

**7. Why is the second session actually unseen?**
It was explicitly held out. All regime boundaries (e.g., median spread thresholds) and signal specifications were calibrated on Session 1, frozen, and blindly mapped onto Session 2.

**8. How did you prevent regime-threshold leakage?**
If we used the combined median spread of Session 1 + 2, Session 2's massive volatility would drag the threshold up, leaking future variance into the Train set. By strictly using the Session 1 median, we preserve OOS integrity.

**9. Why doesn't higher IC imply profitability?**
Spearman IC only measures rank-order correlation. A high IC simply means the signal correctly predicts direction. If the actual magnitude of the price move (e.g., 0.003 bps) is smaller than the cost to cross the spread (e.g., 3.6 bps), the strategy loses money flawlessly.

**10. What is the effect of latency?**
Order-book information is hyper-transient. A delay of just 5 events between signal generation and market execution collapses the gross alpha toward zero, as the market maker has already updated their quotes.

**11. What happens under the null?**
When we randomly permute the target returns, the HAC t-statistic collapses to ~0.001, proving the pipeline doesn't have an organic upward bias.

**12. Why might the signal fail to replicate?**
Market environments shift. Session 1 was a normal, dense regime (~3.6 bps spread). Session 2 experienced a massive liquidity drought (~38.7 bps spread, 4x OFI volatility). In this drought, the structural relationship degraded (IC dropped from 0.36 to 0.14) because passive queue dynamics completely broke down.

**13. What would you need to test next?**
Acquire 6 months of continuous tick data to map these liquidity regime shifts macroscopically.

**14. What part did you implement vs inherit?**
Inherited: The underlying C++ LOB matching engine and `parquet_export.csv` generator.
Implemented: The entire Python empirical research layer—dynamic L2 uncrossing, OFI, event-time labeling, HAC inference, block bootstrapping, multiple testing, latency simulation, and cross-session forensics.
