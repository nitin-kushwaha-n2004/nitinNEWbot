const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  type:      { type: String, enum: ['Zone Hit','Trade Opened','Trade Closed','Daily Limit','Price Alert','Bot Status'], required: true },
  message:   { type: String, required: true },
  pair:      { type: String },
  price:     { type: Number },
  zoneId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
  tradeId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Trade' },
  channels:  [{ type: String, enum: ['telegram','whatsapp','email','call'] }],
  sent:      { type: Boolean, default: false },
  approved:  { type: Boolean },                     // user approved/rejected auto-trade
  autoTradeExecuted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Alert', AlertSchema);
