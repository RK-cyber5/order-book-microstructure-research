import pandas as pd
import numpy as np

def audit_dataset(csv_path='parquet_export.csv'):
    df = pd.read_csv(csv_path)
    
    total_events = len(df)
    book_events = len(df[df['type'] == 'book'])
    trade_events = len(df[df['type'] == 'trade'])
    
    # Check monotonicity
    ts = df['ts_ns'].values
    monotonicity_violations = np.sum(ts[1:] < ts[:-1])
    
    # Missing values
    missing_prices = df['price'].isna().sum()
    missing_sizes = df['qty'].isna().sum()
    
    # Duplicate timestamps
    dup_ts = df['ts_ns'].duplicated().sum()
    
    unique_ts = df['ts_ns'].nunique()
    ts_min = df['ts_ns'].min()
    ts_max = df['ts_ns'].max()
    time_span_sec = (ts_max - ts_min) / 1e9
    
    obs_density = total_events / time_span_sec if time_span_sec > 0 else 0
    
    audit_res = {
        'total_raw_events': total_events,
        'book_events': book_events,
        'trade_events': trade_events,
        'monotonicity_violations': monotonicity_violations,
        'missing_prices': missing_prices,
        'missing_sizes': missing_sizes,
        'duplicate_timestamps': dup_ts,
        'unique_timestamps': unique_ts,
        'time_span_seconds': time_span_sec,
        'observation_density_per_sec': obs_density
    }
    
    return audit_res

if __name__ == '__main__':
    res = audit_dataset()
    for k, v in res.items():
        print(f"{k}: {v}")
