"""
Binance connector using CCXT.
Handles fetching OHLCV, placing orders, and managing positions.
"""
import os
import ccxt
import logging

log = logging.getLogger(__name__)

def get_exchange():
    """Return configured Binance exchange instance."""
    exchange = ccxt.binance({
        'apiKey':  os.getenv('BINANCE_API_KEY'),
        'secret':  os.getenv('BINANCE_SECRET'),
        'options': {'defaultType': 'future'},  # Use 'spot' for spot trading
        'enableRateLimit': True,
    })
    if os.getenv('BINANCE_TESTNET', 'true').lower() == 'true':
        exchange.set_sandbox_mode(True)
        log.info("Running in TESTNET mode")
    return exchange

exchange = get_exchange()

def get_price(symbol: str) -> float:
    """Get current market price for a symbol."""
    ticker = exchange.fetch_ticker(symbol)
    return float(ticker['last'])

def get_ohlcv(symbol: str, timeframe: str = '1h', limit: int = 100):
    """Fetch OHLCV candles. Returns list of [timestamp, open, high, low, close, volume]."""
    return exchange.fetch_ohlcv(symbol, timeframe=timeframe, limit=limit)

def place_order(symbol: str, side: str, usdt_amount: float, stop_loss: float, take_profit: float) -> dict:
    """
    Place a market order with SL and TP.
    side: 'buy' (Long) or 'sell' (Short)
    usdt_amount: total position size in USDT
    """
    try:
        price    = get_price(symbol)
        quantity = round(usdt_amount / price, 6)

        log.info(f"Placing {side.upper()} order: {symbol} qty={quantity} @ ~{price}")

        # Main market order
        order = exchange.create_order(symbol, 'market', side, quantity)

        # Stop Loss order
        sl_side = 'sell' if side == 'buy' else 'buy'
        exchange.create_order(symbol, 'stop_market', sl_side, quantity, params={
            'stopPrice': stop_loss, 'closePosition': True
        })

        # Take Profit order
        exchange.create_order(symbol, 'take_profit_market', sl_side, quantity, params={
            'stopPrice': take_profit, 'closePosition': True
        })

        log.info(f"Order placed successfully: {order['id']}")
        return {'success': True, 'order': order, 'entry': price, 'qty': quantity}

    except Exception as e:
        log.error(f"Order failed: {e}")
        return {'success': False, 'error': str(e)}

def get_balance() -> float:
    """Get total USDT balance."""
    balance = exchange.fetch_balance()
    return float(balance.get('USDT', {}).get('free', 0))

def get_open_positions() -> list:
    """Get all open positions."""
    try:
        positions = exchange.fetch_positions()
        return [p for p in positions if float(p.get('contracts', 0)) > 0]
    except Exception as e:
        log.error(f"Fetch positions failed: {e}")
        return []
