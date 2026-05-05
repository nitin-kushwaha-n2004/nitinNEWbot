const router = require('express').Router();
const Trade = require('../models/Trade');

// GET all trades with optional filters
router.get('/', async (req, res) => {
  try {
    const { pair, result, setup, limit = 100 } = req.query;
    const filter = {};
    if (pair)   filter.pair   = pair;
    if (result) filter.result = result;
    if (setup)  filter.setupType = setup;
    const trades = await Trade.find(filter).sort({ createdAt: -1 }).limit(Number(limit));
    res.json(trades);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST add new trade
router.post('/', async (req, res) => {
  try {
    const { entryPrice, stopLoss, takeProfit1 } = req.body;
    // Calculate R:R before saving
    if (entryPrice && stopLoss && takeProfit1) {
      const risk   = Math.abs(entryPrice - stopLoss);
      const reward = Math.abs(takeProfit1 - entryPrice);
      req.body.riskReward = parseFloat((reward / risk).toFixed(2));
    }
    const trade = await Trade.create(req.body);
    // Emit to connected frontends via socket.io
    req.app.get('io').emit('trade:new', trade);
    res.status(201).json(trade);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// PUT update trade (close trade, update result)
router.put('/:id', async (req, res) => {
  try {
    const trade = await Trade.findByIdAndUpdate(req.params.id, req.body, { new: true });
    req.app.get('io').emit('trade:update', trade);
    res.json(trade);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// DELETE trade
router.delete('/:id', async (req, res) => {
  try {
    await Trade.findByIdAndDelete(req.params.id);
    res.json({ message: 'Trade deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET trade statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const trades = await Trade.find();
    const total  = trades.length;
    const wins   = trades.filter(t => t.result === 'Win').length;
    const losses = trades.filter(t => t.result === 'Loss').length;
    const netPnL = trades.reduce((sum, t) => sum + (t.actualPnL || 0), 0);
    const winRate = total ? ((wins / total) * 100).toFixed(1) : 0;
    const avgRR  = trades.filter(t => t.riskReward).reduce((s,t)=>s+t.riskReward,0) /
                   (trades.filter(t=>t.riskReward).length || 1);
    res.json({ total, wins, losses, netPnL, winRate, avgRR: avgRR.toFixed(2) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
