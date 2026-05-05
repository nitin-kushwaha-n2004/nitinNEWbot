"""
Trading Bot Pro — Python AI Bot
Monitors Binance live prices, checks SMC zones, sends Telegram alerts,
and auto-executes trades if user doesn't reply in time.
"""
import asyncio
import logging
from dotenv import load_dotenv
from scheduler import start_scheduler
from telegram_bot import start_telegram_bot

load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler(), logging.FileHandler('bot.log')]
)
log = logging.getLogger(__name__)

async def main():
    log.info("🤖 Trading Bot Pro starting...")
    # Run zone scanner + telegram bot concurrently
    await asyncio.gather(
        start_scheduler(),
        start_telegram_bot()
    )

if __name__ == '__main__':
    asyncio.run(main())
