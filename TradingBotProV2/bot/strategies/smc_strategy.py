"""
SMC (Smart Money Concept) Strategy Analyzer.
Detects: Liquidity sweeps, FVG, BOS/CHoCH, Order Blocks, Supply/Demand zones.
"""
import pandas as pd
import numpy as np
import logging

log = logging.getLogger(__name__)

def ohlcv_to_df(ohlcv: list) -> pd.DataFrame:
    df = pd.DataFrame(ohlcv, columns=['timestamp','open','high','low','close','volume'])
    df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
    return df.set_index('timestamp')

def find_swing_highs_lows(df: pd.DataFrame, lookback: int = 3):
    """Find swing highs and lows."""
    df = df.copy()
    df['swing_high'] = df['high'][(df['high'] == df['high'].rolling(lookback*2+1, center=True).max())]
    df['swing_low']  = df['low'][ (df['low']  == df['low'].rolling( lookback*2+1, center=True).min())]
    return df

def detect_bos(df: pd.DataFrame) -> dict:
    """
    Detect Break of Structure (BOS) and Change of Character (CHoCH).
    Returns: { 'bos': bool, 'choch': bool, 'direction': 'bullish'|'bearish' }
    """
    df = find_swing_highs_lows(df)
    swing_highs = df['swing_high'].dropna()
    swing_lows  = df['swing_low'].dropna()

    result = {'bos': False, 'choch': False, 'direction': None}
    if len(swing_highs) < 2 or len(swing_lows) < 2:
        return result

    last_close = df['close'].iloc[-1]
    prev_high  = swing_highs.iloc[-1]
    prev_low   = swing_lows.iloc[-1]

    # Bullish BOS: price breaks above last swing high
    if last_close > prev_high:
        result.update({'bos': True, 'direction': 'bullish'})
    # Bearish BOS: price breaks below last swing low
    elif last_close < prev_low:
        result.update({'bos': True, 'direction': 'bearish'})

    return result

def detect_fvg(df: pd.DataFrame) -> list:
    """
    Fair Value Gap detection.
    FVG exists when: candle[i-2].high < candle[i].low (bullish FVG)
                 or: candle[i-2].low  > candle[i].high (bearish FVG)
    Returns list of FVGs: { 'type': 'bullish'|'bearish', 'top': float, 'bottom': float, 'index': int }
    """
    fvgs = []
    for i in range(2, len(df)):
        c0 = df.iloc[i-2]
        c2 = df.iloc[i]
        if c0['high'] < c2['low']:           # Bullish FVG
            fvgs.append({'type':'bullish', 'top':c2['low'], 'bottom':c0['high'], 'idx':i})
        elif c0['low'] > c2['high']:          # Bearish FVG
            fvgs.append({'type':'bearish', 'top':c0['low'], 'bottom':c2['high'], 'idx':i})
    return fvgs[-5:] if fvgs else []           # Return last 5 FVGs

def detect_liquidity_sweep(df: pd.DataFrame) -> dict:
    """
    Detect liquidity sweep: price wicks beyond recent swing H/L and closes back inside.
    """
    df = find_swing_highs_lows(df)
    last = df.iloc[-1]
    prev_high = df['swing_high'].dropna().iloc[-1] if len(df['swing_high'].dropna()) > 0 else None
    prev_low  = df['swing_low'].dropna().iloc[-1]  if len(df['swing_low'].dropna()) > 0 else None

    swept_high = prev_high and last['high'] > prev_high and last['close'] < prev_high
    swept_low  = prev_low  and last['low']  < prev_low  and last['close'] > prev_low

    return {
        'swept_high': swept_high,
        'swept_low':  swept_low,
        'level': prev_high if swept_high else (prev_low if swept_low else None)
    }

def detect_order_block(df: pd.DataFrame) -> list:
    """
    Order Block: last bearish candle before a strong bullish move (demand OB)
              or last bullish candle before a strong bearish move (supply OB)
    """
    obs = []
    for i in range(1, len(df)-1):
        c  = df.iloc[i]
        n  = df.iloc[i+1]
        body = abs(n['close'] - n['open'])
        avg  = df['close'].pct_change().abs().mean()

        # Demand OB: bearish candle followed by strong bullish
        if c['close'] < c['open'] and n['close'] > n['open'] and body > avg * 1.5:
            obs.append({'type':'demand', 'top':c['high'], 'bottom':c['low'], 'idx':i})
        # Supply OB: bullish candle followed by strong bearish
        if c['close'] > c['open'] and n['close'] < n['open'] and body > avg * 1.5:
            obs.append({'type':'supply', 'top':c['high'], 'bottom':c['low'], 'idx':i})
    return obs[-3:] if obs else []

def full_smc_analysis(ohlcv: list, current_price: float, zones: list) -> dict:
    """
    Run full SMC analysis and check if current price is in any saved zone.
    Returns a trade signal if all conditions align.
    """
    if len(ohlcv) < 20:
        return {'signal': False, 'reason': 'Not enough candles'}

    df  = ohlcv_to_df(ohlcv)
    bos = detect_bos(df)
    fvgs= detect_fvg(df)
    liq = detect_liquidity_sweep(df)
    obs = detect_order_block(df)

    hit_zones = [z for z in zones if z['priceFrom'] <= current_price <= z['priceTo'] and z['status'] == 'Active']

    if not hit_zones:
        return {'signal': False, 'reason': 'No active zones hit'}

    zone = hit_zones[0]
    direction = 'Short' if zone['type'] in ['Supply Zone','Resistance'] else 'Long'

    # Score: how many SMC conditions confirm the trade
    score = 0
    reasons = []

    if bos['bos'] and ((direction=='Long' and bos['direction']=='bullish') or (direction=='Short' and bos['direction']=='bearish')):
        score += 2; reasons.append('BOS confirmed')

    if liq['swept_high'] and direction == 'Short':
        score += 2; reasons.append('Liquidity sweep high')
    if liq['swept_low'] and direction == 'Long':
        score += 2; reasons.append('Liquidity sweep low')

    for fvg in fvgs:
        if fvg['bottom'] <= current_price <= fvg['top']:
            score += 1; reasons.append(f"Price in {fvg['type']} FVG"); break

    for ob in obs:
        if ob['bottom'] <= current_price <= ob['top']:
            score += 1; reasons.append(f"Price in {ob['type']} Order Block"); break

    log.info(f"SMC Score: {score}/8 | Reasons: {', '.join(reasons)}")

    if score >= 3:   # Minimum 3 SMC conditions required
        return {
            'signal':    True,
            'direction': direction,
            'zone':      zone,
            'score':     score,
            'reasons':   reasons,
            'fvgs':      fvgs,
            'bos':       bos,
            'liq':       liq
        }

    return {'signal': False, 'score': score, 'reason': f'Only {score}/3 SMC conditions met', 'reasons': reasons}
