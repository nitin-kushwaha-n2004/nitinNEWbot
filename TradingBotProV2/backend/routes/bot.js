const router = require('express').Router();
const BotSettings = require('../models/BotSettings');
const Trade = require('../models/Trade');

// GET bot settings
router.get('/settings', async (req, res) => {
  let settings = await BotSettings.findOne();
  if (!settings) settings = await BotSettings.create({});
  res.json(settings);
});

// PUT update bot settings
router.put('/settings', async (req, res) => {
  try {
    let settings = await BotSettings.findOne();
    if (!settings) settings = new BotSettings();
    Object.assign(settings, req.body);
    await settings.save();
    req.app.get('io').emit('bot:settings_updated', settings);
    res.json(settings);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// POST start/stop bot
router.post('/toggle', async (req, res) => {
  const { active } = req.body;
  const settings = await BotSettings.findOneAndUpdate({}, { isActive: active }, { new: true, upsert: true });
  req.app.get('io').emit('bot:status', { isActive: settings.isActive });
  res.json({ isActive: settings.isActive });
});

// POST — user approves/rejects a pending trade from Telegram
router.post('/approve', async (req, res) => {
  const { alertId, approved, tradeData } = req.body;
  if (approved && tradeData) {
    const trade = await Trade.create({ ...tradeData, isAutoTrade: false });
    req.app.get('io').emit('trade:new', trade);
    res.json({ message: 'Trade approved and logged', trade });
  } else {
    res.json({ message: 'Trade rejected by user' });
  }
});

// GET daily stats (for bot to check limits)
router.get('/daily-check', async (req, res) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const todayTrades = await Trade.find({ createdAt: { $gte: today } });
  const settings = await BotSettings.findOne();
  const todayLoss = todayTrades.filter(t => t.result === 'Loss').reduce((s,t) => s + Math.abs(t.actualPnL || 0), 0);
  const lossLimit = (settings?.totalCapital || 10000) * ((settings?.dailyLossLimitPct || 3) / 100);
  res.json({
    tradesToday:    todayTrades.length,
    maxAllowed:     settings?.maxTradesPerDay || 3,
    todayLoss,
    lossLimit,
    canTrade:       todayTrades.length < (settings?.maxTradesPerDay || 3) && todayLoss < lossLimit
  });
});

module.exports = router;
