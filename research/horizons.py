import pandas as pd
import numpy as np

def compute_horizons(df, horizons=[1, 5, 10, 25, 50, 100, 250, 500]):
    # Note: the core return logic is now inside data.py to avoid 
    # re-calculating on every load. This function audits the horizons.
    audit_records = []
    
    for h in horizons:
        col = f'ret_{h}'
        if col in df.columns:
            valid = df.dropna(subset=[col])
            # elapsed time
            elapsed = (valid['ts_ns'].shift(-h) - valid['ts_ns']) / 1e9
            audit_records.append({
                'horizon_events': h,
                'usable_observations': len(valid),
                'median_elapsed_sec': elapsed.median(),
                'mean_elapsed_sec': elapsed.mean(),
                'mean_return_bps': valid[col].mean() * 10000,
                'std_return_bps': valid[col].std() * 10000
            })
            
    return pd.DataFrame(audit_records)
