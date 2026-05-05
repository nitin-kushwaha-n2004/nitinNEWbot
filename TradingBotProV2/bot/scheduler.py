"""
Scheduler — scans active zones every 30 seconds.
Supports Delta Exchange (default) and Binance via TRADING_PLATFORM env var.
"""
import os
import asyncio
import logging
import requests
import uuid

from strategies.smc_strategy import full_smc_analysis
from telegram_bot import send_message, send_trade_alert, pending_trades

log = logging.getLogger(__name__)
BACKEND  = os.getenv('BACKEND_URL', 'http://localhost:5000/api')
PLATFORM = os.getenv('TRADING_PLATFORM', 'delta').lower()

def _get_connector():
    if PLATFORM == 'binance':
        from connectors.binance_connector import get_price, get_ohlcv, place_order, get_balance
    else:
        from connectors.delta_connector import get_price, get_ohlcv, place_order, get_balance
    return get_price, get_ohlcv, place_order, get_balance

def fetch_settings():
    try: return requests.get(f"{BACKEND}/bot/settings", timeout=5).json()
    except: return {}

def fetch_zones():
    try: return requests.get(f"{BACKEND}/zones?status=Active", timeout=5).json()
    except: return []

def check_daily_limit():
    try: return requests.get(f"{BACKEND}/bot/daily-check", timeout=5).json().get('canTrade', True)
    except: return True

def log_trade_to_backend(trade_data):
    try: requests.post(f"{BACKEND}/trades", json=trade_data, timeout=5)
    except Exception as e: log.error(f"Trade log failed: {e}")

def hit_zone_on_backend(zone_id, price):
    try: requests.post(f"{BACKEND}/zones/{zone_id}/hit", json={'price': price}, timeout=5)
    except: pass

def push_live_price(pair, price):
    try: requests.post(f"{BACKEND}/prices/live", json={'pair': pair, 'price': price}, timeout=3)
    except: pass

def calculate_sl_tp(price, direction, settings):
    min_rr  = settings.get('minRiskReward', 3)
    sl_dist = price * 0.01
    tp_dist = sl_dist * min_rr
    if direction == 'Long':
        return round(price - sl_dist, 2), round(price + tp_dist, 2)
    return round(price + sl_dist, 2), round(price - tp_dist, 2)

async def execute_trade(zone, price, settings, analysis):
    _, _, place_order, _ = _get_connector()
    capital      = settings.get('totalCapital', 10000)
    risk_pct     = settings.get('capitalRiskPct', 1) / 100
    position_usd = capital * risk_pct
    direction    = analysis['direction']
    sl, tp       = calculate_sl_tp(price, direction, settings)
    rr_ratio     = round(abs(tp - price) / abs(price - sl), 1)

    if rr_ratio < settings.get('minRiskReward', 3):
        log.info(f"R:R {rr_ratio} below minimum — skipping"); return

    trade_data = {
        'pair': zone['pair'], 'direction': direction, 'entryPrice': price,
        'stopLoss': sl, 'takeProfit1': tp, 'positionSize': position_usd,
        'riskReward': rr_ratio, 'setupType': zone['type'],
        'timeframe': zone.get('timeframe','4H'), 'isAutoTrade': False,
        'capitalUsed': risk_pct * 100,
        'notes': f"Bot signal. SMC score: {analysis.get('score',0)}/8. {', '.join(analysis.get('reasons',[]))}"
    }
    auto_setting = zone.get('autoTrade', 'Alert + wait for approval')
    alert_id     = str(uuid.uuid4())[:8]

    if auto_setting == 'Auto trade immediately':
        if settings.get('paperTrade', True):
            trade_data['result'] = 'Open'
            log_trade_to_backend(trade_data)
            await send_message(f"📝 *[PAPER]* {direction} {zone['pair']} @ ${price:,.2f}\nSL: ${sl:,.2f} | TP: ${tp:,.2f} | R:R 1:{rr_ratio}")
        else:
            side   = 'buy' if direction == 'Long' else 'sell'
            result = place_order(zone['pair'], side, position_usd, sl, tp)
            if result['success']:
                trade_data['result'] = 'Open'; log_trade_to_backend(trade_data)
                await send_message(f"✅ *LIVE TRADE* {direction} {zone['pair']} @ ${price:,.2f}")
            else:
                await send_message(f"❌ Trade failed: {result.get('error')}")
    else:
        wait_min = 5 if '5 min' in auto_setting else (10 if '10 min' in auto_setting else 999)
        await send_trade_alert(alert_id, trade_data, wait_min)
        if wait_min < 999:
            await asyncio.sleep(wait_min * 60)
            pending = pending_trades.get(alert_id)
            if pending and pending.get('approved') is None:
                pending_trades.pop(alert_id, None)
                trade_data['isAutoTrade'] = True
                if settings.get('paperTrade', True):
                    trade_data['result'] = 'Open'; log_trade_to_backend(trade_data)
                    await send_message(f"⏰ *[AUTO-PAPER]* {direction} {zone['pair']} @ ${price:,.2f}")
                else:
                    result = place_order(zone['pair'], 'buy' if direction == 'Long' else 'sell', position_usd, sl, tp)
                    if result['success']:
                        trade_data['result'] = 'Open'; log_trade_to_backend(trade_data)
                        await send_message(f"⏰ *[AUTO-LIVE]* {direction} {zone['pair']} @ ${price:,.2f}")

async def scan_zones():
    get_price, get_ohlcv, _, _ = _get_connector()
    settings = fetch_settings()
    if not settings.get('isActive', False): return
    if not check_daily_limit(): log.info("Daily limit reached"); return

    zones = fetch_zones()
    if not zones: return

    for pair in list(set(z['pair'] for z in zones)):
        try:
            price      = get_price(pair)
            ohlcv      = get_ohlcv(pair, timeframe=settings.get('mtfTimeframe','1H'), limit=100)
            pair_zones = [z for z in zones if z['pair'] == pair]
            push_live_price(pair, price)
            analysis   = full_smc_analysis(ohlcv, price, pair_zones)
            if analysis.get('signal'):
                log.info(f"🎯 SIGNAL: {analysis['direction']} on {pair} @ {price}")
                hit_zone_on_backend(analysis['zone']['_id'], price)
                asyncio.create_task(execute_trade(analysis['zone'], price, settings, analysis))
            else:
                log.debug(f"{pair} @ {price} — {analysis.get('reason','')}")
        except Exception as e:
            log.error(f"Scan error {pair}: {e}")

async def start_scheduler():
    log.info(f"Zone scanner started — platform: {PLATFORM.upper()} — every 30s")
    await send_message(f"🟢 *Trading Bot Pro* started!\nPlatform: *{PLATFORM.upper()}*\nScanning zones every 30 seconds.")
    while True:
        try: await scan_zones()
        except Exception as e: log.error(f"Scanner error: {e}")
        await asyncio.sleep(30)
