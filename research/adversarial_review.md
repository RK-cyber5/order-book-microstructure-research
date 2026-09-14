# Adversarial Review (Phase 27)

| Issue | Severity | Evidence | Fix | Fixed? |
|-------|----------|----------|-----|--------|
| **Data Leakage in Regimes** | High | Using a global median to define high/low spread leaks future test data into the train set. | Compute median *only* on the training split, and apply that fixed threshold to test. | Yes (Implemented in Phase 9/11) |
| **Statistical Dependence** | High | Returns over 10-event horizons overlap, invalidating IID assumptions for correlation p-values. | Use HAC (Newey-West) standard errors for regressions, and stationary block-bootstrap for Spearman correlations. | Yes |
| **Small Sample Generalization** | Critical | 1.86 hours of data is not a macroeconomic sample. | Explicitly label the study as a "Single-Session Micro-Study". Never claim broad stationarity. | Yes (in Report) |
| **OOS Contamination** | High | Tuning depth weights or features on the full set. | Fixed depth weights ($1/k$ and uniform). No parameter tuning performed. Chronological split enforced. | Yes |
| **Cost Assumptions** | Medium | Assuming 1x spread for crossing could understate adverse selection or slippage. | Modeled standard crossing. Acknowledged as a lower-bound on costs (true costs would be worse, reinforcing the negative conclusion). | Yes |
