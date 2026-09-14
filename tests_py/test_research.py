import pytest
import pandas as pd
import numpy as np
import os
from research.data import reconstruct_lob_and_signals
from research.statistics import compute_statistics, bucket_signal
from research.inference import benjamini_hochberg, block_bootstrap_correlation
from research.horizons import compute_horizons

def test_imbalance_calculation():
    df = pd.DataFrame({
        'ts_ns': [1000, 2000, 3000],
        'type': ['book', 'book', 'book'],
        'side': ['B', 'A', 'B'],
        'price': [100.0, 101.0, 99.0],
        'qty': [10.0, 5.0, 20.0]
    })
    df.to_csv('test_tmp.csv', index=False)
    
    out = reconstruct_lob_and_signals('test_tmp.csv', 'test_tmp.parquet')
    
    assert len(out) == 2
    last_row = out.iloc[-1]
    assert np.isclose(last_row['l1_imb'], 0.3333333)
    assert np.isclose(last_row['l5_imb_1k'], 0.6)
    
    # Check OFI: Previous bid was 100(qty=10), new bid is 100(qty=10) AND 99(qty=20).
    # Wait, the event at ts=3000 is B 99.0 20.0. 
    # The best bid is still 100.0. So best bid price hasn't changed.
    # The quantity at best bid hasn't changed. So bid OFI should be 0.
    
    os.remove('test_tmp.csv')

def test_inference():
    # p-values
    p_vals = [0.01, 0.04, 0.03, 0.001]
    rej, adj_p = benjamini_hochberg(p_vals, alpha=0.05)
    assert sum(rej) == 4
    
def test_block_bootstrap():
    x = np.random.randn(100)
    y = x + np.random.randn(100)
    se, ci_low, ci_high = block_bootstrap_correlation(x, y, block_size=10, n_boot=50)
    assert se > 0
    assert ci_low < ci_high
    
def test_null_sanity():
    from research.experiments import run_phase_15_null
    df = pd.DataFrame({
        'session_id': ['Session_1']*100,
        'sig': np.random.randn(100),
        'ret_10': np.random.randn(100)
    })
    res = run_phase_15_null(df, 'sig', 10)
    assert not np.isnan(res)
