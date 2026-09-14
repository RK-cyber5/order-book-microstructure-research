# Research-Hygiene Ledger (Phase 13)

## Original Hypotheses
- LOB Imbalance significantly predicts short-horizon event-time returns.
- Predictability decays over time and is sensitive to execution costs.

## Confirmatory Analyses
- Cross-session stability test (Train on Session 1, strictly evaluate on unseen Session 2).
- Regime-conditional stability (Applying Session 1's median spread boundary to Session 2).

## Exploratory Analyses
- **Liquidity Drought Investigation:** Following the failure of the signal to replicate strongly in Session 2, we conducted an exploratory forensic analysis into the underlying market conditions (Session 1 vs Session 2 distribution shifts).
- **Latency Generalization:** Modeled 1, 2, 5, 10 event delays iteratively.

## Parameters Fixed Before Unseen-Session Testing
- Spread threshold (Session 1 median: ~3.6 bps).
- Depth threshold (Session 1 median).
- Model definitions (L1, OFI, L5).

## Parameters Changed During Development
- Transitioned from within-session chronological splitting to strict **Cross-Session Walk-Forward** validation after discovering a second independent session in the repository.
