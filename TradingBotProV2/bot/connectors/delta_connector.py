"""
Delta Exchange Connector — India & Global
Handles price fetching, OHLCV, order placement via Delta Exchange REST API.
Uses HMAC-SHA256 signature auth.
"""
import os
import time
import hmac
import hashlib
import requests
import logging

log = logging.getLogger(__name__)

# Delta Exchange India (default) or Global
BASE_URL  = os.getenv('DELTA_BASE_URL', 'https://api.india.delta.exchange')
API_KEY   = os.getenv('DELTA_API_KEY', '')
API_SECRET= os.getenv('DELTA_SECRET_KEY', '')

TESTNET   = os.getenv('DELTA_TESTNET', 'true').lower() == 'true'
if TESTNET:
    BASE_URL = 'https://testnet-api.india.delta.exchange'
    log.info("Delta connector running in TESTNET mode")

# Map pair format BTC/USDT → BTCUSDT (Delta uses product symbols like BTCUSD)
PAIR_MAP = {
    'BTC/USDT': 'BTCUSDT',
    'ETH/USDT': 'ETHUSDT',
    'SOL/USDT': 'SOLUSDT',
    'BNB/USDT': 'BNBUSDT',
    'GOLD/USD': 'XAUUSD',
    'EUR/USD':  'EURUSD',
}

TF_MAP = {
    '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
    '1H': '1h', '4H': '4h', 'Daily': '1d', 'Weekly': '1w'
}

def _sign(method: str, path: str, query: str = '', body: str = '') -> dict:
    """Generate Delta Exchange HMAC-SHA256 auth headers."""
    timestamp = str(int(time.time()))
    message   = method + timestamp + path + query + body
    signature = hmac.new(API_SECRET.encode(), message.encode(), hashlib.sha256).hexdigest()
    return {
        'api-key':   API_KEY,
        'timestamp': timestamp,
        'signature': signature,
        'Content-Type': 'application/json'
    }

def _get(path: str, params: dict = None):
    """Authenticated GET request."""
    query = '?' + '&'.join(f'{k}={v}' for k, v in (params or {}).items()) if params else ''
    headers = _sign('GET', path, query)
    r = requests.get(BASE_URL + path + query, headers=headers, timeout=10)
    r.raise_for_status()
    return r.json()

def _post(path: str, body: dict):
    """Authenticated POST request."""
    import json
    body_str = json.dumps(body)
    headers  = _sign('POST', path, '', body_str)
    r = requests.post(BASE_URL + path, headers=headers, data=body_str, timeout=10)
    r.raise_for_status()
    return r.json()

def get_symbol(pair: str) -> str:
    return PAIR_MAP.get(pair, pair.replace('/', ''))

def get_price(pair: str) -> float:
    """Get current market price for a symbol."""
    symbol = get_symbol(pair)
    try:
        data = _get(f'/v2/tickers/{symbol}')
        return float(data['result']['close'])
    except Exception as e:
        log.error(f"Delta get_price failed for {symbol}: {e}")
        raise

def get_ohlcv(pair: str, timeframe: str = '1H', limit: int = 100) -> list:
    """
    Fetch OHLCV candles from Delta Exchange.
    Returns list of [timestamp_ms, open, high, low, close, volume]
    """
    symbol     = get_symbol(pair)
    resolution = TF_MAP.get(timeframe, '1h')
    end_ts     = int(time.time())
    # Rough start time based on timeframe
    tf_seconds = {'1m':60,'5m':300,'15m':900,'30m':1800,'1h':3600,'4h':14400,'1d':86400,'1w':604800}
    start_ts   = end_ts - limit * tf_seconds.get(resolution, 3600)

    try:
        data = _get('/v2/history/candles', {
            'resolution': resolution,
            'symbol':     symbol,
            'start':      start_ts,
            'end':        end_ts
        })
        candles = data.get('result', [])
        # Delta returns {time, open, high, low, close, volume}
        return [[c['time'] * 1000, float(c['open']), float(c['high']),
                 float(c['low']), float(c['close']), float(c.get('volume', 0))]
                for c in candles[-limit:]]
    except Exception as e:
        log.error(f"Delta get_ohlcv failed for {symbol}: {e}")
        raise

def place_order(pair: str, side: str, usdt_amount: float,
                stop_loss: float, take_profit: float) -> dict:
    """
    Place a market order with SL and TP on Delta Exchange.
    side: 'buy' (Long) or 'sell' (Short)
    usdt_amount: position size in USDT
    """
    symbol = get_symbol(pair)
    try:
        price    = get_price(pair)
        qty      = round(usdt_amount / price, 4)
        order_side = 'buy' if side == 'buy' else 'sell'

        log.info(f"Placing {order_side.upper()} order: {symbol} qty={qty} @ ~{price}")

        # Market entry order
        order = _post('/v2/orders', {
            'product_symbol': symbol,
            'order_type':     'market_order',
            'side':           order_side,
            'size':           qty,
        })

        # Stop Loss order
        sl_side = 'sell' if order_side == 'buy' else 'buy'
        _post('/v2/orders', {
            'product_symbol':    symbol,
            'order_type':        'stop_market_order',
            'side':              sl_side,
            'size':              qty,
            'stop_price':        stop_loss,
            'stop_trigger_method': 'last_traded_price',
            'reduce_only':       True,
            'close_on_trigger':  True,
        })

        # Take Profit order
        _post('/v2/orders', {
            'product_symbol':    symbol,
            'order_type':        'take_profit_market_order',
            'side':              sl_side,
            'size':              qty,
            'stop_price':        take_profit,
            'stop_trigger_method': 'last_traded_price',
            'reduce_only':       True,
            'close_on_trigger':  True,
        })

        log.info(f"Delta order placed: {order.get('result', {}).get('id')}")
        return {'success': True, 'order': order, 'entry': price, 'qty': qty}

    except Exception as e:
        log.error(f"Delta order failed: {e}")
        return {'success': False, 'error': str(e)}

def get_balance() -> float:
    """Get available USDT balance."""
    try:
        data = _get('/v2/wallet/balances')
        for asset in data.get('result', []):
            if asset.get('asset_symbol') in ('USDT', 'USD'):
                return float(asset.get('available_balance', 0))
        return 0.0
    except Exception as e:
        log.error(f"Delta get_balance failed: {e}")
        return 0.0

def get_open_positions() -> list:
    """Get all open positions."""
    try:
        data = _get('/v2/positions/margined')
        return [p for p in data.get('result', []) if float(p.get('size', 0)) > 0]
    except Exception as e:
        log.error(f"Delta get_positions failed: {e}")
        return []
