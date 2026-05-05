const mongoose = require('mongoose');

const ZoneSchema = new mongoose.Schema({
  type: { type: String, enum: [
    'Supply Zone','Demand Zone','Fair Value Gap',
    'Resistance','Support','Liquidity Level','Order Block','Breaker Block'
  ], required: true },
  pair:       { type: String, required: true },
  timeframe:  { type: String, required: true },
  priceFrom:  { type: Number, required: true },
  priceTo:    { type: Number, required: true },
  direction:  { type: String, enum: ['Long','Short','Alert Only'], required: true },
  autoTrade:  { type: String, enum: [
    'Alert + wait for approval',
    'Auto trade immediately',
    'Auto trade if no reply in 5 min',
    'Auto trade if no reply in 10 min'
  ], default: 'Alert + wait for approval' },
  status:     { type: String, enum: ['Active','Hit','Filled','Invalidated'], default: 'Active' },
  notes:      { type: String },
  hitCount:   { type: Number, default: 0 },
  lastHitAt:  { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Zone', ZoneSchema);
