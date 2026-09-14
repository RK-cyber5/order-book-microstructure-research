# Changelog

## Upstream Functionality Reused
- The high-performance C++ limit order book matching engine.
- Existing replay/analytics infrastructure used to generate the raw `parquet_export.csv` data.
- The pre-existing Streamlit dashboard and microstructure modules (`olob.metrics`).

## Original Research Contribution (My Work)
- **Data Engineering**: Created `research/data.py` to dynamically reconstruct L2 depth from raw diff events, implementing robust uncrossing logic. Added `research/data_quality.py` for comprehensive data auditing.
- **Feature Engineering**: Implemented Midprice, L1 Imbalance, L1 Microprice, Microprice Deviation, Relative Spread, L1-L5 weighted imbalances (1/k and uniform), and Cont et al.'s Order Flow Imbalance (OFI).
- **Event-Time Research**: Evaluated predictive horizons purely in event time (1 to 500 events).
- **Statistical Inference**: Implemented `research/inference.py` using Newey-West (HAC) robust standard errors, block bootstrapping, and Benjamini-Hochberg FDR control to address high-frequency dependence and multiple testing.
- **OOS Validation**: Implemented strict chronological out-of-sample (Train/Test) splits.
- **Incremental Information**: Used multivariate OLS regressions to prove whether OFI or L5 depth adds information beyond simple L1 imbalance.
- **Cost & Latency Analysis**: Quantified net returns assuming realistic bid-ask spread crossing and simulated execution delays (1 to 10 events late).
- **Sanity Checks**: Developed a negative-control/null hypothesis check by randomly shuffling targets to ensure the pipeline doesn't manufacture alpha.
- **Research Reports**: Authored `research/report.md`, `research/audit_v2.md`, and `research/executive_summary.md` detailing the methodology, limitations, and findings.
- **Reproducibility**: Consolidated the entire pipeline into `research/run_all.py` and expanded the unit test suite (`tests_py/test_research.py`).
