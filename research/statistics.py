import pandas as pd
import numpy as np
import scipy.stats as stats
from research.inference import run_regression_hac, block_bootstrap_correlation

def bucket_signal(df, signal_col, num_buckets=10):
    unique_vals = df[signal_col].nunique()
    if unique_vals < num_buckets:
        num_buckets = max(2, unique_vals)
    try:
        buckets, bins = pd.qcut(df[signal_col], q=num_buckets, retbins=True, duplicates='drop')
        return buckets
    except ValueError:
        return pd.cut(df[signal_col], bins=num_buckets)

def compute_statistics(df, signal_col, target_col, horizon=10):
    valid = df[[signal_col, target_col]].dropna()
    if len(valid) == 0:
        return None
    
    x = valid[signal_col].values
    y = valid[target_col].values
    
    pearson_corr, p_p = stats.pearsonr(x, y)
    spearman_corr, p_s = stats.spearmanr(x, y)
    
    # Use HAC for regression to get robust p-values and SEs
    res = run_regression_hac(valid, [signal_col], target_col, max_lags=horizon)
    if res is not None:
        beta = res.params[signal_col]
        t_stat = res.tvalues[signal_col]
        hac_p_value = res.pvalues[signal_col]
        r_squared = res.rsquared
    else:
        beta = t_stat = hac_p_value = r_squared = np.nan

    # Directional Accuracy
    non_zero = valid[(valid[signal_col] != 0) & (valid[target_col] != 0)]
    if len(non_zero) > 0:
        dir_acc = np.mean(np.sign(non_zero[signal_col]) == np.sign(non_zero[target_col]))
    else:
        dir_acc = np.nan
        
    stats_dict = {
        'signal': signal_col,
        'target': target_col,
        'N': len(valid),
        'pearson_ic': pearson_corr,
        'spearman_ic': spearman_corr,
        'beta': beta,
        't_stat_hac': t_stat,
        'p_value_hac': hac_p_value,
        'r_squared': r_squared,
        'dir_accuracy': dir_acc
    }
    
    return stats_dict

def bucketed_analysis(df, signal_col, target_col, num_buckets=10):
    valid = df[[signal_col, target_col]].dropna().copy()
    if len(valid) == 0:
        return pd.DataFrame()
        
    valid['bucket'] = bucket_signal(valid, signal_col, num_buckets)
    grouped = valid.groupby('bucket', observed=False)[target_col].agg(['count', 'mean', 'std'])
    grouped['se'] = grouped['std'] / np.sqrt(grouped['count'])
    grouped['ci_lower'] = grouped['mean'] - 1.96 * grouped['se']
    grouped['ci_upper'] = grouped['mean'] + 1.96 * grouped['se']
    
    grouped = grouped.reset_index()
    grouped['signal'] = signal_col
    grouped['target'] = target_col
    return grouped
