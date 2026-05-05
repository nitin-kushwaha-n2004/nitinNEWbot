const router = require('express').Router();

// In-memory store for latest prices
const latestPrices = {};

// Called by Python bot every 30s to push live prices
router.post('/live', (req, res) => {
  const { pair, price } = req.body;
  if (!pair || price === undefined) return res.status(400).json({ error: 'pair and price required' });
  latestPrices[pair] = { price: Number(price), updatedAt: new Date() };
  // Broadcast to all connected frontend clients
  req.app.get('io').emit('price:update', { pair, price: Number(price) });
  res.json({ ok: true });
});

// GET snapshot of all latest prices (for initial load)
router.get('/latest', (req, res) => {
  res.json(latestPrices);
});

module.exports = router;
