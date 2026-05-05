# Trading Bot Pro — SMC AI Auto Trader v1.1

> Full-stack AI trading bot with Delta Exchange integration, Smart Money Concept (SMC) strategy, Telegram alerts, and React dashboard.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite + TailwindCSS + Recharts |
| Backend  | Node.js + Express + MongoDB (Mongoose) + Socket.io |
| AI Bot   | Python + Delta Exchange REST API + CCXT |
| Charts   | TradingView Pine Script |
| Alerts   | Telegram Bot + Nodemailer + Twilio |

## Project Structure

```
TradingBotPro/
├── backend/           → Node.js API server (port 5000)
│   ├── models/        → MongoDB schemas (Trade, Zone, BotSettings, Alert)
│   ├── routes/        → REST API routes
│   ├── middleware/    → JWT auth
│   └── controllers/   → Notification controllers
├── frontend/          → React dashboard (port 5173)
│   └── src/pages/     → Dashboard, Zones, Journal, BotConfig, Alerts, LiveChat, Backtest, Settings
├── bot/               → Python AI trading bot
│   ├── connectors/    → delta_connector.py + binance_connector.py
│   ├── strategies/    → smc_strategy.py (BOS, FVG, Liquidity Sweep, Order Blocks)
│   └── main.py        → Entry point
└── pinescript/        → TradingView indicators
```

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB (local or Atlas)
- Delta Exchange account (or Binance)
- Telegram Bot token

---

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Fill in your keys in .env
npm run dev
# Server runs on http://localhost:5000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Dashboard opens at http://localhost:5173
```

### 3. Python Bot Setup

```bash
cd bot
pip install -r requirements.txt
cp .env.example .env
# Fill in your keys in .env
python main.py
```

---

## Environment Variables

### backend/.env
```
MONGO_URI=mongodb://localhost:27017/tradingbot
JWT_SECRET=your_secret_key

# Delta Exchange India
DELTA_API_KEY=your_key
DELTA_SECRET_KEY=your_secret
DELTA_TESTNET=true          # Change to false for live trading

TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
EMAIL_USER=you@gmail.com
EMAIL_PASS=gmail_app_password
```

### bot/.env
```
BACKEND_URL=http://localhost:5000/api
TRADING_PLATFORM=delta      # 'delta' or 'binance'

DELTA_API_KEY=your_key
DELTA_SECRET_KEY=your_secret
DELTA_TESTNET=true

TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
```

---

## How To Get Delta Exchange API Keys

1. Login at [delta.exchange](https://www.delta.exchange) or [India](https://india.delta.exchange)
2. Go to **Account → API Management**
3. Create new API key with **Read + Trade** permissions
4. Copy API Key and Secret Key to your `.env` files

## How To Get Telegram Bot Token

1. Open Telegram, search `@BotFather`
2. Send `/newbot` — follow steps
3. Copy the token to `TELEGRAM_BOT_TOKEN`
4. Start a chat with your bot, then visit:
   `https://api.telegram.org/bot<TOKEN>/getUpdates`
5. Copy the `chat.id` to `TELEGRAM_CHAT_ID`

---

## Features

- **Zone Manager** — Add Supply/Demand/FVG/OB zones with price alerts
- **AI Bot** — SMC strategy (BOS, CHoCH, FVG, Liquidity Sweep, Order Blocks)
- **Paper Trade Mode** — Test risk-free before going live
- **Auto Trade** — Execute immediately, or wait for Telegram approval
- **Trade Journal** — Log trades with R:R, setup type, P&L tracking
- **Backtest Engine** — Analyze strategy performance on trade history
- **Alerts** — Telegram, Email, WhatsApp, Phone call notifications
- **Live Chat** — Team feed with real-time bot/webhook updates
- **TradingView Webhook** — Accept alerts from Pine Script indicators

## Telegram Commands

| Command | Action |
|---------|--------|
| `/start` | Show bot menu |
| `/status` | Bot status + capital info |
| `/zones` | List active zones |
| `/trades` | Last 5 trades |
| `/stop` | Stop the bot |
| `/start_bot` | Start the bot |
| `YES` | Approve pending trade signal |
| `NO` | Reject pending trade signal |

## TradingView Webhook Setup

1. In your Pine Script alert, set Webhook URL to:
   ```
   http://YOUR_SERVER:5000/api/webhook/tradingview
   ```
2. Set message body:
   ```json
   {"secret":"YOUR_WEBHOOK_SECRET","pair":"{{ticker}}","type":"Zone Alert","price":"{{close}}","direction":"Short"}
   ```

---

## ⚠️ Disclaimer

This software is for **personal use and educational purposes only**.  
Trading involves significant financial risk. Always use proper risk management.  
The authors are not responsible for any financial losses.
