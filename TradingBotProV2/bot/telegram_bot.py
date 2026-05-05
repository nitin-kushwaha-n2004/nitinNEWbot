"""
Telegram Bot — handles alerts, trade approvals, and bot commands.
User replies YES/NO to approve or reject a pending trade signal.
"""
import os
import asyncio
import logging
from telegram import Update, Bot
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

log = logging.getLogger(__name__)

# Pending trades waiting for user approval: { alert_id: { tradeData, timer_task } }
pending_trades = {}

TOKEN   = os.getenv('TELEGRAM_BOT_TOKEN')
CHAT_ID = os.getenv('TELEGRAM_CHAT_ID')

async def send_message(text: str):
    """Send a plain message to the configured chat."""
    if not TOKEN or not CHAT_ID:
        log.warning("Telegram not configured — skipping alert")
        return
    bot = Bot(token=TOKEN)
    await bot.send_message(chat_id=CHAT_ID, text=text, parse_mode='Markdown')

async def send_trade_alert(alert_id: str, trade_data: dict, wait_minutes: int = 5):
    """
    Send a trade signal alert. Store it as pending.
    Auto-execute if user doesn't reply within wait_minutes.
    """
    msg = (
        f"🤖 *TRADE SIGNAL*\n\n"
        f"Pair:      *{trade_data['pair']}*\n"
        f"Direction: *{trade_data['direction']}*\n"
        f"Entry:     *${trade_data['entryPrice']:,.2f}*\n"
        f"Stop Loss: *${trade_data['stopLoss']:,.2f}*\n"
        f"TP:        *${trade_data['takeProfit1']:,.2f}*\n"
        f"R:R:       *1:{trade_data['riskReward']}*\n"
        f"Setup:     *{trade_data['setupType']}*\n\n"
        f"Reply *YES* to execute or *NO* to skip.\n"
        f"⏱ Auto-executes in *{wait_minutes} min* if no reply."
    )
    await send_message(msg)
    log.info(f"Trade alert sent for {alert_id}")

    # Store pending trade
    pending_trades[alert_id] = {'tradeData': trade_data, 'approved': None}

async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🤖 *Trading Bot Pro* is running!\n\n"
        "Commands:\n"
        "/status — Bot status\n"
        "/trades — Recent trades\n"
        "/zones  — Active zones\n"
        "/stop   — Stop the bot\n"
        "/start_bot — Start the bot",
        parse_mode='Markdown'
    )

async def cmd_status(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    import requests
    try:
        r = requests.get(f"{os.getenv('BACKEND_URL')}/bot/settings", timeout=5)
        s = r.json()
        status = '✅ Active' if s.get('isActive') else '⏸ Stopped'
        paper  = '📝 Paper Trade' if s.get('paperTrade') else '💰 Live Trade'
        await update.message.reply_text(
            f"*Bot Status*\n\n{status} | {paper}\nCapital: ${s.get('totalCapital',0):,}\nRisk/trade: {s.get('capitalRiskPct',1)}%",
            parse_mode='Markdown'
        )
    except:
        await update.message.reply_text("⚠️ Could not reach backend server.")

async def cmd_zones(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    import requests
    try:
        r = requests.get(f"{os.getenv('BACKEND_URL')}/zones?status=Active", timeout=5)
        zones = r.json()
        if not zones:
            await update.message.reply_text("No active zones.")
            return
        lines = [f"🎯 *Active Zones ({len(zones)})*\n"]
        for z in zones:
            lines.append(f"• {z['type']} | {z['pair']} {z['timeframe']} | {z['priceFrom']:,}–{z['priceTo']:,} | {z['direction']}")
        await update.message.reply_text('\n'.join(lines), parse_mode='Markdown')
    except:
        await update.message.reply_text("⚠️ Could not fetch zones.")

async def cmd_trades(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    import requests
    try:
        r = requests.get(f"{os.getenv('BACKEND_URL')}/trades?limit=5", timeout=5)
        trades = r.json()
        lines = [f"📊 *Last {len(trades)} Trades*\n"]
        for t in trades:
            pnl = f"+${t['actualPnL']}" if (t.get('actualPnL') or 0) >= 0 else f"-${abs(t.get('actualPnL',0))}"
            lines.append(f"• {t['pair']} {t['direction']} | {t['result']} | {pnl}")
        await update.message.reply_text('\n'.join(lines), parse_mode='Markdown')
    except:
        await update.message.reply_text("⚠️ Could not fetch trades.")

async def cmd_stop_bot(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    import requests
    try:
        requests.post(f"{os.getenv('BACKEND_URL')}/bot/toggle", json={'active': False}, timeout=5)
        await update.message.reply_text("⏸ Bot stopped.")
    except:
        await update.message.reply_text("⚠️ Could not stop bot.")

async def cmd_start_bot(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    import requests
    try:
        requests.post(f"{os.getenv('BACKEND_URL')}/bot/toggle", json={'active': True}, timeout=5)
        await update.message.reply_text("▶️ Bot started! Monitoring zones...")
    except:
        await update.message.reply_text("⚠️ Could not start bot.")

async def handle_reply(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Handle YES/NO replies for trade approvals."""
    text = update.message.text.strip().upper()
    if not pending_trades:
        return

    # Get the most recent pending trade
    alert_id = list(pending_trades.keys())[-1]
    trade = pending_trades[alert_id]

    if text == 'YES':
        trade['approved'] = True
        pending_trades.pop(alert_id, None)
        import requests
        try:
            requests.post(f"{os.getenv('BACKEND_URL')}/bot/approve",
                json={'alertId': alert_id, 'approved': True, 'tradeData': trade['tradeData']}, timeout=5)
        except: pass
        await update.message.reply_text(
            f"✅ Trade approved!\n{trade['tradeData']['pair']} {trade['tradeData']['direction']} executing...",
            parse_mode='Markdown'
        )
    elif text == 'NO':
        trade['approved'] = False
        pending_trades.pop(alert_id, None)
        await update.message.reply_text("❌ Trade rejected. Skipping this signal.")
    else:
        # Not a YES/NO — check if it's a command
        if not text.startswith('/'):
            await update.message.reply_text("Reply *YES* to execute or *NO* to skip the pending trade.", parse_mode='Markdown')

async def start_telegram_bot():
    """Start the Telegram bot application."""
    if not TOKEN:
        log.warning("TELEGRAM_BOT_TOKEN not set — Telegram bot disabled")
        await asyncio.sleep(999999)
        return

    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler('start',     cmd_start))
    app.add_handler(CommandHandler('status',    cmd_status))
    app.add_handler(CommandHandler('zones',     cmd_zones))
    app.add_handler(CommandHandler('trades',    cmd_trades))
    app.add_handler(CommandHandler('stop',      cmd_stop_bot))
    app.add_handler(CommandHandler('start_bot', cmd_start_bot))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_reply))

    log.info("Telegram bot started. Listening for commands...")
    await app.run_polling()
