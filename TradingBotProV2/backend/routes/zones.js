const router = require('express').Router();
const Zone  = require('../models/Zone');
const Alert = require('../models/Alert');
const { sendTelegramAlert } = require('../controllers/notificationController');

router.get('/',    async (req, res) => {
  const { pair, status } = req.query;
  const filter = {};
  if (pair)   filter.pair   = pair;
  if (status) filter.status = status;
  res.json(await Zone.find(filter).sort({ createdAt: -1 }));
});

router.post('/',   async (req, res) => {
  try {
    const zone = await Zone.create(req.body);
    req.app.get('io').emit('zone:new', zone);
    res.status(201).json(zone);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  const zone = await Zone.findByIdAndUpdate(req.params.id, req.body, { new: true });
  req.app.get('io').emit('zone:update', zone);
  res.json(zone);
});

router.delete('/:id', async (req, res) => {
  await Zone.findByIdAndDelete(req.params.id);
  res.json({ message: 'Zone removed' });
});

// Called by Python bot when price enters a zone
router.post('/:id/hit', async (req, res) => {
  try {
    const { price } = req.body;
    const zone = await Zone.findByIdAndUpdate(req.params.id,
      { status: 'Hit', $inc: { hitCount: 1 }, lastHitAt: new Date() },
      { new: true }
    );
    const alert = await Alert.create({
      type: 'Zone Hit',
      message: `${zone.type} HIT on ${zone.pair} at $${price} | Direction: ${zone.direction}`,
      pair: zone.pair, price, zoneId: zone._id, channels: ['telegram','whatsapp','email']
    });
    // Send Telegram alert immediately
    await sendTelegramAlert(alert.message);
    req.app.get('io').emit('alert:new', alert);
    res.json({ zone, alert });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
