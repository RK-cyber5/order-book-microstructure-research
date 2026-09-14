import pandas as pd
import numpy as np

def analyze_costs(df, signals, horizon=10):
    """Analyzes the economic significance of the signal after crossing the spread"""
    cost_records = []
    for sig in signals:
        thresh = df[sig].abs().quantile(0.75)
        trades = df[df[sig].abs() > thresh].copy()
        
        target = f'ret_{horizon}'
        if target not in trades.columns:
            continue
            
        trades['gross_ret'] = np.sign(trades[sig]) * trades[target]
        trades['cost'] = trades['rel_spread']
        trades['net_ret'] = trades['gross_ret'] - trades['cost']
        
        cost_records.append({
            'signal': sig,
            'N_trades': len(trades),
            'mean_gross_ret_bps': trades['gross_ret'].mean() * 10000,
            'mean_net_ret_bps': trades['net_ret'].mean() * 10000,
            'profitable_gross': (trades['gross_ret'] > 0).mean(),
            'profitable_net': (trades['net_ret'] > 0).mean()
        })
        
    return pd.DataFrame(cost_records)
