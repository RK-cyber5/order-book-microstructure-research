# Reproducibility Audit (Phase 1)

## Environment
- **Python Version:** 3.11.15
- **OS:** Windows (PowerShell)
- **Dependencies:** pandas, numpy, scipy, statsmodels, matplotlib, seaborn

## Dataset Identifiers
- `parquet_export.csv` (Session 1: ~1.86h, 36,463 states, starting 1756086289764000000 ns)
- `out/backtests/day17_hour/parquet_export.csv` (Session 2: ~1.0h, 74,338 states, starting 1756195622348000000 ns)
- **Random Seed:** Numpy default for bootstrap iterations, explicit 42 for null testing.

## Execution
Run the complete deep forensics pipeline from the root directory:
```bash
.venv\Scripts\python.exe -m research.deep_forensics
```
- **Runtime:** ~60 seconds.
- **Passes:** All tests in `tests_py/test_research.py` successfully completed without failure.
