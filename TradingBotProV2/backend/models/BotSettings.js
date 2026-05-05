const mongoose = require('mongoose');

const BotSettingsSchema = new mongoose.Schema({
  isActive:        { type: Boolean, default: false },
  paperTrade:      { type: Boolean, default: true },      // always start in paper mode
  strategy:        { type: String, default: 'SMC' },
  htfTimeframe:    { type: String, default: '4H' },
  mtfTimeframe:    { type: String, default: '1H' },
  entryTimeframe:  { type: String, default: '15m' },
  minRiskReward:   { type: Number, default: 3 },          // 1:3 minimum
  capitalRiskPct:  { type: Number, default: 1 },          // 1% per trade
  maxTradesPerDay: { type: Number, default: 3 },
  dailyLossLimitPct: { type: Number, default: 3 },
  autoReplyWaitMin:  { type: Number, default: 5 },        // wait before auto-trade
  smcFilters: {
    liquiditySweep:   { type: Boolean, default: true },
    fvg:              { type: Boolean, default: true },
    orderBlock:       { type: Boolean, default: true },
    bos:              { type: Boolean, default: true },
    choch:            { type: Boolean, default: true },
    multiTFConfluence:{ type: Boolean, default: true },
    avoidNewsCandles: { type: Boolean, default: true }
  },
  notifications: {
    telegram:  { enabled: Boolean, chatId: String, botToken: String },
    whatsapp:  { enabled: Boolean, phone: String },
    email:     { enabled: Boolean, address: String },
    call:      { enabled: Boolean, phone: String }
  },
  binanceApiKey:  { type: String },
  binanceSecret:  { type: String },
  totalCapital:   { type: Number, default: 10000 },
  totalTodayTrades: { type: Number, default: 0 },
  totalTodayLoss:   { type: Number, default: 0 },
  lastResetDate:    { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('BotSettings', BotSettingsSchema);
