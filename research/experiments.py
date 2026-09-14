import os
import pandas as pd
import numpy as np
import statsmodels.api as sm
from research.data import build_multisession_dataset
from research.inference import benjamini_hochberg, block_bootstrap_correlation
from research.data_quality import audit_dataset

def compute_hac_stats(df, signal_cols, target_col, max_lags=10):
    valid = df[signal_cols + [target_col]].dropna()
    if len(valid) == 0:
        return None
    X = sm.add_constant(valid[signal_cols])
    y = valid[target_col]
    model = sm.OLS(y, X).fit(cov_type='HAC', cov_kwds={'maxlags': max_lags})
    return model

def run_multisession_oos(df, signals, horizons):
    print("Running Multi-Session OOS & Walk-Forward")
    sessions = df['session_id'].unique()
    
    if len(sessions) > 1:
        # Cross-session: Train on session 1, Test on session 2
        train = df[df['session_id'] == sessions[0]]
        test = df[df['session_id'] == sessions[1]]
        eval_type = 'Cross-Session'
    else:
        # Fallback to within-session if only 1 session exists
        split_idx = int(len(df) * 0.7)
        train = df.iloc[:split_idx]
        test = df.iloc[split_idx:]
        eval_type = 'Within-Session'

    oos_records = []
    for sig in signals:
        for h in horizons:
            target = f'ret_{h}'
            train_valid = train[[sig, target]].dropna()
            test_valid = test[[sig, target]].dropna()
            
            if len(train_valid) > 100 and len(test_valid) > 100:
                tr_se, tr_low, tr_high = block_bootstrap_correlation(train_valid[sig], train_valid[target], block_size=100, n_boot=20)
                from scipy.stats import spearmanr
                tr_ic, _ = spearmanr(train_valid[sig], train_valid[target])
                
                te_se, te_low, te_high = block_bootstrap_correlation(test_valid[sig], test_valid[target], block_size=100, n_boot=20)
                te_ic, _ = spearmanr(test_valid[sig], test_valid[target])
                
                oos_records.append({
                    'signal': sig,
                    'horizon': h,
                    'eval_type': eval_type,
                    'train_n': len(train_valid),
                    'test_n': len(test_valid),
                    'train_spearman': tr_ic,
                    'train_ci_low': tr_low,
                    'train_ci_high': tr_high,
                    'test_spearman': te_ic,
                    'test_ci_low': te_low,
                    'test_ci_high': te_high
                })
    return pd.DataFrame(oos_records)

def run_per_session_stability(df, signals, horizons):
    print("Running Per-Session Stability")
    sessions = df['session_id'].unique()
    records = []
    from scipy.stats import spearmanr, pearsonr
    
    for sess in sessions:
        sess_df = df[df['session_id'] == sess]
        for sig in signals:
            for h in horizons:
                target = f'ret_{h}'
                valid = sess_df[[sig, target]].dropna()
                if len(valid) > 100:
                    se, low, high = block_bootstrap_correlation(valid[sig], valid[target], block_size=100, n_boot=20)
                    ic_sp, _ = spearmanr(valid[sig], valid[target])
                    ic_pe, _ = pearsonr(valid[sig], valid[target])
                    
                    # Dir acc
                    dir_acc = np.mean(np.sign(valid[sig]) == np.sign(valid[target]))
                    
                    records.append({
                        'session_id': sess,
                        'signal': sig,
                        'horizon': h,
                        'n_obs': len(valid),
                        'spearman_ic': ic_sp,
                        'pearson_ic': ic_pe,
                        'ci_low': low,
                        'ci_high': high,
                        'dir_acc': dir_acc
                    })
    
    session_res = pd.DataFrame(records)
    session_res.to_csv('results/session_results.csv', index=False)
    
    # Cross-session summary
    if len(session_res) > 0:
        agg = session_res.groupby(['signal', 'horizon']).agg(
            mean_ic=('spearman_ic', 'mean'),
            median_ic=('spearman_ic', 'median'),
            std_ic=('spearman_ic', 'std'),
            min_ic=('spearman_ic', 'min'),
            max_ic=('spearman_ic', 'max'),
            count_sessions=('session_id', 'count')
        ).reset_index()
        
        # Calculate fraction of same sign
        def frac_positive(g):
            return np.mean(g['spearman_ic'] > 0)
        frac = session_res.groupby(['signal', 'horizon']).apply(frac_positive).reset_index(name='fraction_positive')
        agg = pd.merge(agg, frac, on=['signal', 'horizon'])
        agg.to_csv('results/cross_session_summary.csv', index=False)
        agg.to_csv('results/stability_analysis.csv', index=False)
    
    return session_res

def run_phase_11_incremental(df, base_sig='l1_imb', add_sigs=['ofi', 'l5_imb_1k'], horizon=10):
    print("Running Incremental Information")
    target = f'ret_{horizon}'
    sessions = df['session_id'].unique()
    
    if len(sessions) > 1:
        test = df[df['session_id'] == sessions[1]].dropna(subset=[base_sig] + add_sigs + [target])
    else:
        split_idx = int(len(df) * 0.7)
        test = df.iloc[split_idx:].dropna(subset=[base_sig] + add_sigs + [target])
        
    if len(test) == 0:
        return pd.DataFrame()
        
    res_base = compute_hac_stats(test, [base_sig], target, max_lags=horizon)
    records = [{
        'model': 'baseline (L1)',
        'r_squared': res_base.rsquared if res_base else 0,
        'adj_r_squared': res_base.rsquared_adj if res_base else 0,
        'base_p_val': res_base.pvalues.get(base_sig, np.nan) if res_base else np.nan
    }]
    
    for sig in add_sigs:
        res_inc = compute_hac_stats(test, [base_sig, sig], target, max_lags=horizon)
        records.append({
            'model': f'base + {sig}',
            'r_squared': res_inc.rsquared if res_inc else 0,
            'adj_r_squared': res_inc.rsquared_adj if res_inc else 0,
            'base_p_val': res_inc.pvalues.get(base_sig, np.nan) if res_inc else np.nan,
            'added_p_val': res_inc.pvalues.get(sig, np.nan) if res_inc else np.nan
        })
        
    res_all = compute_hac_stats(test, [base_sig] + add_sigs, target, max_lags=horizon)
    records.append({
        'model': 'base + all',
        'r_squared': res_all.rsquared if res_all else 0,
        'adj_r_squared': res_all.rsquared_adj if res_all else 0,
        'base_p_val': res_all.pvalues.get(base_sig, np.nan) if res_all else np.nan
    })
    
    return pd.DataFrame(records)

def run_phase_12_costs_latency(df, signals, horizon=10):
    print("Running Costs and Latency")
    sessions = df['session_id'].unique()
    
    if len(sessions) > 1:
        train = df[df['session_id'] == sessions[0]]
        test = df[df['session_id'] == sessions[1]]
    else:
        split_idx = int(len(df) * 0.7)
        train = df.iloc[:split_idx]
        test = df.iloc[split_idx:]
    
    latencies = [0, 1, 2, 5, 10]
    cost_records = []
    
    for sig in signals:
        thresh = train[sig].abs().quantile(0.75)
        trades = test[test[sig].abs() > thresh].copy()
        
        target_0 = f'ret_{horizon}'
        if target_0 not in trades.columns or len(trades) == 0: continue
        
        cost = trades['rel_spread']
        rec = {'signal': sig, 'N_trades': len(trades)}
        
        for L in latencies:
            if L == 0:
                gross = np.sign(trades[sig]) * trades[target_0]
            else:
                target_lat = f'ret_{horizon}_lat_{L}'
                if target_lat in trades.columns:
                    gross = np.sign(trades[sig]) * trades[target_lat]
                else:
                    continue
            
            net = gross - cost
            rec[f'gross_lat_{L}_bps'] = gross.mean() * 10000
            rec[f'net_lat_{L}_bps'] = net.mean() * 10000
            
        cost_records.append(rec)
        
    return pd.DataFrame(cost_records)

def run_phase_15_null(df, signal, horizon=10):
    print("Running Null Sanity Test")
    sessions = df['session_id'].unique()
    test = df[df['session_id'] == sessions[-1]].copy()
    valid = test[[signal, f'ret_{horizon}']].dropna().copy()
    valid['shuffled_target'] = np.random.permutation(valid[f'ret_{horizon}'].values)
    
    res = compute_hac_stats(valid, [signal], 'shuffled_target', max_lags=horizon)
    return res.tvalues[signal] if res else np.nan

def generate_inventory(files_dict):
    records = []
    for sid, path in files_dict.items():
        if os.path.exists(path):
            tmp = pd.read_csv(path)
            total = len(tmp)
            book = len(tmp[tmp['type']=='book'])
            start = tmp['ts_ns'].min()
            end = tmp['ts_ns'].max()
            records.append({
                'session_id': sid,
                'source': path,
                'total_events': total,
                'valid_l2_states': book,
                'time_span_sec': (end - start)/1e9
            })
    pd.DataFrame(records).to_csv('results/dataset_inventory.csv', index=False)

def run_full_pipeline():
    os.makedirs('results/figures', exist_ok=True)
    
    files_dict = {
        'Session_1': 'parquet_export.csv',
        'Session_2': 'out/backtests/day17_hour/parquet_export.csv'
    }
    
    generate_inventory(files_dict)
    print("Building Multi-session dataset...")
    df = build_multisession_dataset(files_dict, 'research/events_with_signals.parquet')
    
    signals = ['l1_imb', 'l5_imb_1k', 'l5_imb_uni', 'microprice_dev', 'ofi', 'rel_spread']
    horizons = [1, 2, 5, 10, 20, 50, 100, 250, 500]
    
    run_per_session_stability(df, signals, horizons)
    
    # Train is session 1 (or 70% if 1 session)
    sessions = df['session_id'].unique()
    if len(sessions) > 1:
        train = df[df['session_id'] == sessions[0]]
        test = df[df['session_id'] == sessions[1]]
    else:
        split_idx = int(len(df) * 0.7)
        train = df.iloc[:split_idx]
        test = df.iloc[split_idx:]
        
    multi_test = []
    for sig in signals:
        for h in horizons:
            res = compute_hac_stats(test, [sig], f'ret_{h}', max_lags=h)
            if res:
                multi_test.append({
                    'signal': sig, 'horizon': h, 
                    'beta': res.params[sig], 't_stat': res.tvalues[sig], 'raw_p_value': res.pvalues[sig]
                })
                
    multi_df = pd.DataFrame(multi_test)
    if not multi_df.empty:
        rej, adj_p = benjamini_hochberg(multi_df['raw_p_value'].values)
        multi_df['fdr_p_value'] = adj_p
        multi_df['significant'] = rej
    multi_df.to_csv('results/multiple_testing.csv', index=False)
    
    oos_df = run_multisession_oos(df, signals, horizons)
    oos_df.to_csv('results/horizon_analysis.csv', index=False)
    
    # Regimes (Multi-session OOS)
    median_spread = train['rel_spread'].median()
    test_copy = test.copy()
    test_copy['regime_spread'] = np.where(test_copy['rel_spread'] > median_spread, 'High Spread', 'Low Spread')
    
    regime_records = []
    for regime in ['High Spread', 'Low Spread']:
        test_regime = test_copy[test_copy['regime_spread'] == regime]
        for sig in signals:
            tr_ic, _ = __import__('scipy').stats.spearmanr(test_regime[sig], test_regime['ret_10'], nan_policy='omit')
            regime_records.append({'signal': sig, 'regime': regime, 'spearman_ic_oos': tr_ic})
    pd.DataFrame(regime_records).to_csv('results/regime_analysis.csv', index=False)
    
    inc_df = run_phase_11_incremental(df, 'l1_imb', ['ofi', 'l5_imb_1k'], 10)
    inc_df.to_csv('results/incremental_information.csv', index=False)
    
    costs_df = run_phase_12_costs_latency(df, signals, 10)
    costs_df.to_csv('results/cost_analysis.csv', index=False)
    costs_df.to_csv('results/latency_sensitivity.csv', index=False)
    
    null_t = run_phase_15_null(df, 'l1_imb', 10)
    pd.DataFrame([{'null_t_stat': null_t}]).to_csv('results/robustness_matrix.csv', index=False)
    
    print("Multi-session Pipeline Complete.")

if __name__ == '__main__':
    run_full_pipeline()
