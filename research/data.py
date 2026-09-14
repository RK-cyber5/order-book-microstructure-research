import pandas as pd
import numpy as np
import os

def reconstruct_lob_and_signals(csv_path, session_id):
    print(f"Reading {csv_path}...")
    df = pd.read_csv(csv_path)
    
    bids = {}
    asks = {}
    records = []
    
    prev_best_bid = None
    prev_best_ask = None
    prev_bid_sz = 0
    prev_ask_sz = 0
    
    for row in df.itertuples():
        if row.type == 'book':
            price = row.price
            qty = row.qty
            if row.side == 'B':
                if qty == 0: bids.pop(price, None)
                else:
                    bids[price] = qty
                    crossed = [p for p in asks.keys() if p <= price]
                    for p in crossed: asks.pop(p, None)
            else:
                if qty == 0: asks.pop(price, None)
                else:
                    asks[price] = qty
                    crossed = [p for p in bids.keys() if p >= price]
                    for p in crossed: bids.pop(p, None)
        
        if len(bids) > 0 and len(asks) > 0:
            best_bid = max(bids.keys())
            best_ask = min(asks.keys())
            
            if best_bid < best_ask:
                sorted_bids = sorted(bids.items(), key=lambda x: x[0], reverse=True)[:5]
                sorted_asks = sorted(asks.items(), key=lambda x: x[0])[:5]
                
                mid = (best_bid + best_ask) / 2.0
                spread = best_ask - best_bid
                rel_spread = spread / mid
                
                bid_sz = sorted_bids[0][1]
                ask_sz = sorted_asks[0][1]
                
                l1_imb = (bid_sz - ask_sz) / (bid_sz + ask_sz) if (bid_sz + ask_sz) > 0 else 0
                
                w_1k_bid = sum((1.0 / (i + 1)) * sz for i, (p, sz) in enumerate(sorted_bids))
                w_1k_ask = sum((1.0 / (i + 1)) * sz for i, (p, sz) in enumerate(sorted_asks))
                l5_imb_1k = (w_1k_bid - w_1k_ask) / (w_1k_bid + w_1k_ask) if (w_1k_bid + w_1k_ask) > 0 else 0
                
                w_uni_bid = sum(sz for i, (p, sz) in enumerate(sorted_bids))
                w_uni_ask = sum(sz for i, (p, sz) in enumerate(sorted_asks))
                l5_imb_uni = (w_uni_bid - w_uni_ask) / (w_uni_bid + w_uni_ask) if (w_uni_bid + w_uni_ask) > 0 else 0
                
                microprice = (best_bid * ask_sz + best_ask * bid_sz) / (bid_sz + ask_sz) if (bid_sz + ask_sz) > 0 else mid
                microprice_dev = (microprice - mid) / mid
                
                ofi = 0
                if prev_best_bid is not None and prev_best_ask is not None:
                    if best_bid > prev_best_bid: bid_ofi = bid_sz
                    elif best_bid == prev_best_bid: bid_ofi = bid_sz - prev_bid_sz
                    else: bid_ofi = -prev_bid_sz
                        
                    if best_ask < prev_best_ask: ask_ofi = ask_sz
                    elif best_ask == prev_best_ask: ask_ofi = ask_sz - prev_ask_sz
                    else: ask_ofi = -prev_ask_sz
                        
                    ofi = bid_ofi - ask_ofi
                
                prev_best_bid = best_bid
                prev_best_ask = best_ask
                prev_bid_sz = bid_sz
                prev_ask_sz = ask_sz
                
                records.append({
                    'session_id': session_id,
                    'ts_ns': row.ts_ns,
                    'mid': mid,
                    'spread': spread,
                    'rel_spread': rel_spread,
                    'l1_imb': l1_imb,
                    'l5_imb_1k': l5_imb_1k,
                    'l5_imb_uni': l5_imb_uni,
                    'microprice': microprice,
                    'microprice_dev': microprice_dev,
                    'ofi': ofi,
                    'best_bid': best_bid,
                    'best_ask': best_ask,
                    'best_bid_sz': bid_sz,
                    'best_ask_sz': ask_sz
                })
                
    out_df = pd.DataFrame(records)
    
    horizons = [1, 2, 5, 10, 20, 50, 100, 250, 500]
    for h in horizons:
        out_df[f'mid_future_{h}'] = out_df['mid'].shift(-h)
        out_df[f'ret_{h}'] = (out_df[f'mid_future_{h}'] / out_df['mid']) - 1.0
        for L in [1, 2, 5, 10]:
            out_df[f'ret_{h}_lat_{L}'] = (out_df[f'mid_future_{h}'] / out_df['mid'].shift(-L)) - 1.0
        
    print(f"Generated {len(out_df)} valid book states for {session_id}.")
    return out_df

def build_multisession_dataset(files_dict, out_path='research/events_with_signals.parquet'):
    dfs = []
    for sid, path in files_dict.items():
        if os.path.exists(path):
            dfs.append(reconstruct_lob_and_signals(path, sid))
    if dfs:
        combined = pd.concat(dfs, ignore_index=True)
        combined.to_parquet(out_path, index=False)
        print(f"Combined {len(combined)} rows saved to {out_path}")
        return combined
    return pd.DataFrame()
