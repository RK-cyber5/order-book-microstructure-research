# Data Audit

## Dataset Description
The repository contains a sample dataset of order book updates and trades for Binance US BTCUSDT. The data is available in two main formats:
1. **Raw Events (`parquet_export.csv`)**: Sequential book updates and trades.
2. **Time-Sampled Quotes (`taq_quotes.parquet`)**: Best bid/ask and derived metrics sampled on a fixed 50ms grid.
3. **Trades (`taq_trades.parquet`)**: Executed trades.

## Schema
- **Raw Events (`parquet_export.csv`)**: `ts_ns` (timestamp in nanoseconds), `type` ('book' or 'trade'), `side` ('B' or 'A'), `price` (tick level), `qty` (size).
- **Time-Sampled Quotes (`taq_quotes.parquet`)**: `ts_ns`, `bid_px`, `bid_sz`, `ask_px`, `ask_sz`, `mid`, `spread`, `microprice`.

## Observations & Time Coverage
- **Raw Events**: 36,484 total events (36,446 book updates, 38 trades).
- **Time-Sampled Quotes**: 134,467 observations (sampled every 50ms).
- **Time Range**: `1756086289764000000` to `1756093013104000000` (nanoseconds). This corresponds to approximately 1.86 hours of continuous market data.

## Missingness & Data Quality
- The dataset is clean without `NaN` prices for active events. 
- Some book crossing was detected due to the nature of incremental diff depth lacking an initial snapshot. We handle this dynamically by assuming aggressive crossed limits clear out resting stale levels.
- The trades dataset is quite sparse (only 38 trades), reflecting a highly passive or low-activity period, or filtering.

## Limitations & Sufficiency
- **Limitation**: The time coverage is limited to roughly 1.86 hours. A production-grade alpha research project would typically require months of data. Furthermore, the number of actual trades is very low, making trade-based event time less useful than quote-based event time.
- **Sufficiency**: For demonstrating statistical predictability of order flow imbalance, 36,446 sequential quote events is sufficient. We can measure short-horizon predictive decay (1 to 100 quote events) with reasonable statistical confidence (thousands of observations per bucket).

We will use the **quote-update event time** rather than trade event time or fixed calendar time to satisfy the project requirements.
