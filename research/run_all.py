import os
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from research.experiments import run_full_pipeline

def plot_results():
    print("--- Generating Figures ---")
    os.makedirs('results/figures', exist_ok=True)
    
    # New Multi-Session Figures
    try:
        sr = pd.read_csv('results/session_results.csv')
        h10 = sr[sr['horizon'] == 10]
        plt.figure(figsize=(10,6))
        sns.barplot(data=h10, x='signal', y='spearman_ic', hue='session_id')
        plt.title('Session IC Distribution (h=10)')
        plt.savefig('results/figures/session_ic_distribution.png')
        plt.close()
    except Exception as e: print(e)
    
    try:
        cs = pd.read_csv('results/cross_session_summary.csv')
        cs10 = cs[cs['horizon'] == 10]
        plt.figure(figsize=(10,6))
        sns.barplot(data=cs10, x='signal', y='mean_ic')
        plt.errorbar(x=range(len(cs10)), y=cs10['mean_ic'], yerr=cs10['std_ic'], fmt='none', c='black')
        plt.title('Cross-Session IC (Mean +/- Std)')
        plt.savefig('results/figures/cross_session_ic.png')
        plt.close()
    except Exception as e: print(e)
    
    try:
        reg = pd.read_csv('results/regime_analysis.csv')
        plt.figure(figsize=(8,5))
        sns.barplot(data=reg, x='signal', y='spearman_ic_oos', hue='regime')
        plt.title('Regime Stability (Cross-Session OOS)')
        plt.savefig('results/figures/regime_stability.png')
        plt.close()
    except Exception as e: print(e)
    
    try:
        oos = pd.read_csv('results/horizon_analysis.csv')
        plt.figure(figsize=(10,6))
        sns.lineplot(data=oos, x='horizon', y='test_spearman', hue='signal', marker='o')
        plt.title('Cross-Session OOS Performance')
        plt.savefig('results/figures/oos_performance_by_session.png')
        plt.close()
    except Exception as e: print(e)

    # Standard Figures
    try:
        lat = pd.read_csv('results/latency_sensitivity.csv')
        lat_melt = lat.melt(id_vars=['signal'], value_vars=['gross_lat_0_bps', 'net_lat_0_bps', 'net_lat_5_bps', 'net_lat_10_bps'], 
                            var_name='Scenario', value_name='Bps')
        plt.figure(figsize=(12,6))
        sns.barplot(data=lat_melt, x='signal', y='Bps', hue='Scenario')
        plt.title('Latency and Cost Sensitivity (Cross-Session OOS)')
        plt.savefig('results/figures/08_09_cost_latency.png')
        plt.close()
    except Exception as e: print(e)
    
    try:
        inc = pd.read_csv('results/incremental_information.csv')
        plt.figure(figsize=(8,5))
        sns.barplot(data=inc, x='model', y='adj_r_squared')
        plt.title('Incremental Information (Cross-Session OOS)')
        plt.xticks(rotation=15)
        plt.savefig('results/figures/07_incremental_information.png')
        plt.close()
    except Exception as e: print(e)

if __name__ == '__main__':
    run_full_pipeline()
    plot_results()
    print("Done!")
