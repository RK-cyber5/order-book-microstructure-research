import pandas as pd
import numpy as np
import statsmodels.api as sm
from scipy.stats import spearmanr
from research.inference import block_bootstrap_correlation

def hac_stats(df, x_cols, y_col, max_lags):
    valid = df[x_cols + [y_col]].dropna()
    if len(valid) < 100: return None
    X = sm.add_constant(valid[x_cols])
    y = valid[y_col]
    return sm.OLS(y, X).fit(cov_type='HAC', cov_kwds={'maxlags': max_lags})

def run_all():
    df = pd.read_parquet('research/events_with_signals.parquet')
    signals = ['l1_imb', 'l5_imb_1k', 'ofi', 'microprice_dev']
    horizons = [1, 2, 5, 10, 20, 50, 100]
    
    # Phase 4: Signal Stability by Session
    s_matrix = []
    for sess in ['Session_1', 'Session_2']:
        sdf = df[df['session_id'] == sess]
        for sig in signals:
            for h in horizons:
                tgt = f'ret_{h}'
                v = sdf[[sig, tgt]].dropna()
                if len(v) > 100:
                    ic, _ = spearmanr(v[sig], v[tgt])
                    dir_acc = np.mean(np.sign(v[sig]) == np.sign(v[tgt]))
                    s_matrix.append({'session': sess, 'signal': sig, 'horizon': h, 'ic': ic, 'dir_acc': dir_acc, 'n': len(v)})
    pd.DataFrame(s_matrix).to_csv('results/session_signal_matrix.csv', index=False)
    
    # Phase 6: Conditional Stability
    # Define thresholds strictly on Session 1
    s1 = df[df['session_id'] == 'Session_1']
    s1_med_spread = s1['rel_spread'].median()
    s1_med_depth = s1['best_bid_sz'].median()
    
    cond_matrix = []
    for sess in ['Session_1', 'Session_2']:
        sdf = df[df['session_id'] == sess].copy()
        sdf['spread_regime'] = np.where(sdf['rel_spread'] > s1_med_spread, 'Wide', 'Narrow')
        sdf['depth_regime'] = np.where(sdf['best_bid_sz'] > s1_med_depth, 'Deep', 'Shallow')
        
        for reg_col in ['spread_regime', 'depth_regime']:
            for reg_val in sdf[reg_col].unique():
                sub = sdf[sdf[reg_col] == reg_val]
                for sig in ['l1_imb', 'ofi']:
                    v = sub[[sig, 'ret_10']].dropna()
                    if len(v) > 100:
                        ic, _ = spearmanr(v[sig], v['ret_10'])
                        cond_matrix.append({
                            'session': sess, 'condition': reg_col, 'regime': reg_val,
                            'signal': sig, 'ic': ic, 'n': len(v)
                        })
    pd.DataFrame(cond_matrix).to_csv('results/conditional_stability.csv', index=False)
    
    # Phase 8: Incremental Info
    inc_records = []
    for sess in ['Session_1', 'Session_2']:
        sdf = df[df['session_id'] == sess].dropna(subset=['l1_imb', 'microprice_dev', 'ofi', 'l5_imb_1k', 'ret_10'])
        
        models = {
            'M0_Base': ['l1_imb'],
            'M1_Micro': ['l1_imb', 'microprice_dev'],
            'M2_OFI': ['l1_imb', 'ofi'],
            'M3_All': ['l1_imb', 'ofi', 'l5_imb_1k']
        }
        for m_name, cols in models.items():
            fit = hac_stats(sdf, cols, 'ret_10', max_lags=10)
            if fit:
                inc_records.append({
                    'session': sess, 'model': m_name, 'adj_r2': fit.rsquared_adj,
                    'l1_pval': fit.pvalues.get('l1_imb', np.nan),
                    'added_pval': fit.pvalues.get(cols[-1], np.nan) if len(cols)>1 else np.nan
                })
    pd.DataFrame(inc_records).to_csv('results/incremental_information.csv', index=False)
    
    # Phase 10 & 11: Latency & Cost
    lat_records = []
    cost_records = []
    for sess in ['Session_1', 'Session_2']:
        sdf = df[df['session_id'] == sess].copy()
        
        # execution thresholds from S1!
        thresh_l1 = s1['l1_imb'].abs().quantile(0.75)
        trades = sdf[sdf['l1_imb'].abs() > thresh_l1].copy()
        
        if len(trades) > 0:
            for lat in [0, 1, 2, 5, 10]:
                ret_col = f'ret_10_lat_{lat}' if lat > 0 else 'ret_10'
                if ret_col in trades.columns:
                    gross = np.sign(trades['l1_imb']) * trades[ret_col]
                    ic, _ = spearmanr(trades['l1_imb'], trades[ret_col])
                    lat_records.append({
                        'session': sess, 'latency': lat, 'ic': ic, 
                        'gross_bps': gross.mean()*10000
                    })
                    
            # Cost sensitivity at latency 0
            ret = np.sign(trades['l1_imb']) * trades['ret_10']
            for cost_mult in [0.5, 1.0, 2.0]:
                cost = trades['rel_spread'] * cost_mult
                net = ret - cost
                cost_records.append({
                    'session': sess, 'cost_multiplier': cost_mult,
                    'gross_bps': ret.mean()*10000, 'cost_bps': cost.mean()*10000, 'net_bps': net.mean()*10000
                })
                
    pd.DataFrame(lat_records).to_csv('results/session_latency.csv', index=False)
    pd.DataFrame(cost_records).to_csv('results/session_cost_sensitivity.csv', index=False)

    # Phase 12 & 14: Null Robustness & Confounding (Summary)
    rob = []
    for sess in ['Session_1', 'Session_2']:
        sdf = df[df['session_id'] == sess].copy()
        valid = sdf[['l1_imb', 'ret_10']].dropna()
        if len(valid) > 100:
            shuffled = np.random.permutation(valid['ret_10'].values)
            valid['null_ret'] = shuffled
            fit = hac_stats(valid, ['l1_imb'], 'null_ret', max_lags=10)
            null_t = fit.tvalues['l1_imb'] if fit else np.nan
            rob.append({'session': sess, 'null_t_stat': null_t})
    pd.DataFrame(rob).to_csv('results/robustness_summary.csv', index=False)

if __name__ == '__main__':
    run_all()
