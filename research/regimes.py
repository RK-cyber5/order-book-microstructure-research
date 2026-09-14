import pandas as pd
import numpy as np
from research.statistics import compute_statistics

def analyze_regimes(df, signals, horizons=[10]):
    """Analyzes signals under varying spread and volatility regimes"""
    median_spread = df['rel_spread'].median()
    df['regime_spread'] = np.where(df['rel_spread'] > median_spread, 'High Spread', 'Low Spread')
    
    df['mid_ret_1'] = df['mid'].pct_change()
    df['rolling_vol'] = df['mid_ret_1'].rolling(100).std()
    median_vol = df['rolling_vol'].median()
    df['regime_vol'] = np.where(df['rolling_vol'] > median_vol, 'High Vol', 'Low Vol')
    
    regime_stats = []
    for reg_col in ['regime_spread', 'regime_vol']:
        for regime in df[reg_col].dropna().unique():
            df_regime = df[df[reg_col] == regime]
            for sig in signals:
                for h in horizons:
                    target = f'ret_{h}'
                    sd = compute_statistics(df_regime, sig, target)
                    if sd:
                        sd['regime_type'] = reg_col
                        sd['regime'] = regime
                        regime_stats.append(sd)
                        
    return pd.DataFrame(regime_stats)
