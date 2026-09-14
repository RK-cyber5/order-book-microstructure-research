import pandas as pd
import numpy as np
import statsmodels.api as sm

def benjamini_hochberg(p_values, alpha=0.05):
    """
    Applies Benjamini-Hochberg FDR control to a list of p-values.
    Returns boolean array of rejections and adjusted p-values.
    """
    n = len(p_values)
    if n == 0:
        return np.array([]), np.array([])
    
    sorted_indices = np.argsort(p_values)
    sorted_p = np.array(p_values)[sorted_indices]
    
    adjusted_p = np.zeros(n)
    running_min = 1.0
    for i in range(n - 1, -1, -1):
        p = sorted_p[i]
        adj = p * n / (i + 1)
        running_min = min(running_min, adj)
        adjusted_p[sorted_indices[i]] = running_min
        
    rejections = adjusted_p <= alpha
    return rejections, adjusted_p

def run_regression_hac(df, x_cols, y_col, max_lags=10):
    """
    Runs OLS with Newey-West HAC robust standard errors.
    This accounts for autocorrelation in overlapping return windows.
    """
    valid = df[x_cols + [y_col]].dropna()
    if len(valid) == 0:
        return None
        
    X = valid[x_cols]
    y = valid[y_col]
    X = sm.add_constant(X)
    
    # Fit OLS
    model = sm.OLS(y, X)
    # Newey-West standard errors (HAC)
    results = model.fit(cov_type='HAC', cov_kwds={'maxlags': max_lags})
    
    return results

def block_bootstrap_correlation(x, y, block_size=100, n_boot=500):
    """
    Stationary block bootstrap for Spearman correlation to account for dependence.
    """
    n = len(x)
    boot_corrs = []
    
    for _ in range(n_boot):
        # randomly select starting indices for blocks
        starts = np.random.randint(0, n - block_size + 1, size=n // block_size + 1)
        indices = np.concatenate([np.arange(s, s + block_size) for s in starts])[:n]
        
        x_b = x.iloc[indices] if isinstance(x, pd.Series) else x[indices]
        y_b = y.iloc[indices] if isinstance(y, pd.Series) else y[indices]
        
        from scipy.stats import spearmanr
        corr, _ = spearmanr(x_b, y_b)
        boot_corrs.append(corr)
        
    boot_corrs = np.array(boot_corrs)
    se = np.std(boot_corrs)
    ci_lower = np.percentile(boot_corrs, 2.5)
    ci_upper = np.percentile(boot_corrs, 97.5)
    
    return se, ci_lower, ci_upper
