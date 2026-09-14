import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

INPUT = "taq_quotes.csv"

df = pd.read_csv(INPUT)

# Parse timestamps
if "ts_dt" in df.columns:
    df["ts_dt"] = pd.to_datetime(df["ts_dt"], utc=True, errors="coerce")

# Forward-fill quote state because TAQ data contains incremental updates
for col in ["bid", "ask", "bid_sz", "ask_sz"]:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce").ffill()

# Valid top-of-book observations
df = df.dropna(subset=["bid", "ask", "bid_sz", "ask_sz"]).copy()

# Mid-price
df["mid"] = (df["bid"] + df["ask"]) / 2

# L1 imbalance in [-1, 1]
denom = df["bid_sz"] + df["ask_sz"]
df = df[denom > 0].copy()

df["imbalance"] = (
    (df["bid_sz"] - df["ask_sz"]) / denom
)

# Future mid-price returns over quote-event horizons
horizons = [1, 5, 10]

results = []

for h in horizons:
    df[f"future_return_{h}"] = (
        df["mid"].shift(-h) / df["mid"] - 1.0
    )

    tmp = df.dropna(subset=[f"future_return_{h}"]).copy()

    # Five imbalance buckets
    tmp["imbalance_bucket"] = pd.qcut(
        tmp["imbalance"],
        q=5,
        duplicates="drop"
    )

    grouped = (
        tmp.groupby("imbalance_bucket", observed=True)[f"future_return_{h}"]
        .agg(["mean", "std", "count"])
        .reset_index()
    )

    grouped["horizon"] = h
    results.append(grouped)

results_df = pd.concat(results, ignore_index=True)

print("\n=== Multi-Horizon OFI/Imbalance Analysis ===\n")
print(results_df.to_string(index=False))

# Save numerical results
results_df.to_csv(
    "analytics/imbalance_multihorizon_results.csv",
    index=False
)

# Plot each horizon
for h in horizons:
    plot_df = results_df[results_df["horizon"] == h]

    x = np.arange(len(plot_df))

    plt.figure(figsize=(8, 5))
    plt.plot(
        x,
        plot_df["mean"] * 1e4,
        marker="o"
    )

    plt.xticks(
        x,
        [f"Q{i}" for i in range(1, len(plot_df) + 1)]
    )

    plt.axhline(0, linewidth=1)
    plt.xlabel("L1 imbalance quintile")
    plt.ylabel("Mean future mid-price return (bps)")
    plt.title(f"Imbalance vs Future Return — {h} Quote Events")

    plt.tight_layout()

    plt.savefig(
        f"analytics/plots/imbalance_future_return_{h}.png",
        dpi=200
    )

    plt.close()

print("\nSaved:")
print("analytics/imbalance_multihorizon_results.csv")
for h in horizons:
    print(f"analytics/plots/imbalance_future_return_{h}.png")