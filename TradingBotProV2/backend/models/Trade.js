const mongoose = require('mongoose');

const TradeSchema = new mongoose.Schema({
  pair:        { type: String, required: true },          // e.g. BTC/USDT
  direction:   { type: String, enum: ['Long','Short'], required: true },
  entryPrice:  { type: Number, required: true },
  stopLoss:    { type: Number, required: true },
  takeProfit1: { type: Number },
  takeProfit2: { type: Number },
  positionSize: { type: Number },                          // in USD
  riskReward:  { type: Number },                          // e.g. 4.2 means 1:4.2
  setupType:   { type: String, enum: [
    'Liquidity Sweep','FVG Fill','Supply Zone','Demand Zone',
    'Order Block','Breaker Block','BOS Retest','Breakout Retest','Smart Money Reversal'
  ]},
  timeframe:   { type: String },
  result:      { type: String, enum: ['Open','Win','Loss','Break Even'], default: 'Open' },
  actualPnL:   { type: Number, default: 0 },
  exitPrice:   { type: Number },
  exitTime:    { type: Date },
  notes:       { type: String },
  isAutoTrade: { type: Boolean, default: false },         // was it bot-executed?
  capitalUsed: { type: Number },                          // % of capital
  screenshot:  { type: String },                          // URL
  entryTime:   { type: Date, default: Date.now }
}, { timestamps: true });

// Virtual: R:R calculation
TradeSchema.virtual('rrRatio').get(function(){
  if(!this.takeProfit1 || !this.stopLoss) return null;
  const risk   = Math.abs(this.entryPrice - this.stopLoss);
  const reward = Math.abs(this.takeProfit1 - this.entryPrice);
  return (reward / risk).toFixed(2);
});

module.exports = mongoose.model('Trade', TradeSchema);
