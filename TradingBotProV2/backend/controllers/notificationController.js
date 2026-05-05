const axios     = require('axios');
const nodemailer = require('nodemailer');

// ─── TELEGRAM ─────────────────────────────────────────────────────────────────
async function sendTelegramAlert(message) {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) { console.warn('Telegram not configured'); return; }
  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text:    `🤖 *TradingBot Pro*\n\n${message}`,
      parse_mode: 'Markdown'
    });
    console.log('Telegram alert sent');
  } catch (err) {
    console.error('Telegram error:', err.response?.data || err.message);
  }
}

// Send trade approval request — user replies YES/NO in Telegram
async function sendTradeApprovalRequest(tradeData) {
  const msg = `📊 *TRADE SIGNAL*\n\n` +
    `Pair: *${tradeData.pair}*\n` +
    `Direction: *${tradeData.direction}*\n` +
    `Entry: *$${tradeData.entryPrice}*\n` +
    `Stop Loss: *$${tradeData.stopLoss}*\n` +
    `Take Profit: *$${tradeData.takeProfit1}*\n` +
    `R:R: *1:${tradeData.riskReward}*\n` +
    `Setup: *${tradeData.setupType}*\n\n` +
    `Reply *YES* to execute or *NO* to skip.\n` +
    `Auto-executes in 5 min if no reply.`;
  await sendTelegramAlert(msg);
}

// ─── EMAIL ────────────────────────────────────────────────────────────────────
async function sendEmail(subject, body) {
  if (!process.env.EMAIL_USER) { console.warn('Email not configured'); return; }
  const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
  await transporter.sendMail({
    from:    process.env.EMAIL_USER,
    to:      process.env.EMAIL_USER,
    subject: `[TradingBot] ${subject}`,
    html:    `<pre style="font-family:sans-serif">${body}</pre>`
  });
}

module.exports = { sendTelegramAlert, sendEmail, sendTradeApprovalRequest };
