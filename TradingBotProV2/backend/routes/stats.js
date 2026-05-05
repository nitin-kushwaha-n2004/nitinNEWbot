const router = require('express').Router();
const Trade = require('../models/Trade');

router.get('/dashboard', async (req, res) => {
  try {
    const trades = await Trade.find();
    const total  = trades.length;
    const wins   = trades.filter(t => t.result === 'Win').length;
    const losses = trades.filter(t => t.result === 'Loss').length;
    const open   = trades.filter(t => t.result === 'Open').length;
    const netPnL = trades.reduce((s, t) => s + (t.actualPnL || 0), 0);
    const winRate = total ? ((wins / total) * 100).toFixed(1) : 0;
    const avgRR   = trades.filter(t => t.riskReward).length
      ? (trades.filter(t=>t.riskReward).reduce((s,t)=>s+t.riskReward,0) / trades.filter(t=>t.riskReward).length).toFixed(2)
      : 0;

    // Monthly P&L for chart (last 6 months)
    const monthly = {};
    trades.forEach(t => {
      const m = new Date(t.createdAt).toLocaleString('default',{month:'short',year:'2-digit'});
      monthly[m] = (monthly[m] || 0) + (t.actualPnL || 0);
    });

    // Setup breakdown
    const setups = {};
    trades.forEach(t => {
      if(t.setupType) setups[t.setupType] = (setups[t.setupType]||0)+1;
    });

    res.json({ total, wins, losses, open, netPnL, winRate, avgRR, monthly, setups });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
