const router = require('express').Router();
const Zone  = require('../models/Zone');
const Alert = require('../models/Alert');
const { sendTelegramAlert } = require('../controllers/notificationController');

/*
  TradingView Pine Script sends a webhook POST to:
  POST /api/webhook/tradingview
  Body (JSON): { secret, pair, type, price, direction }

  In TradingView Alert → Webhook URL:
  http://YOUR_SERVER:5000/api/webhook/tradingview
*/
router.post('/tradingview', async (req, res) => {
  try {
    const { secret, pair, type, price, direction } = req.body;

    // Verify webhook secret
    if (secret !== process.env.TRADINGVIEW_WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }

    console.log(`TradingView Alert: ${type} on ${pair} @ ${price}`);

    // Find matching active zone
    const zones = await Zone.find({ pair, status: 'Active' });
    const hitZone = zones.find(z => price >= z.priceFrom && price <= z.priceTo);

    const message = hitZone
      ? `🎯 ZONE HIT: ${hitZone.type} on ${pair} at $${price}\nDirection: ${hitZone.direction}\nAuto: ${hitZone.autoTrade}`
      : `📊 TV Alert: ${type} on ${pair} at $${price}\nDirection: ${direction || 'N/A'}`;

    // Send Telegram immediately
    await sendTelegramAlert(message);

    // Save alert to DB
    const alert = await Alert.create({
      type: hitZone ? 'Zone Hit' : 'Price Alert',
      message,
      pair,
      price: Number(price),
      zoneId: hitZone?._id,
      channels: ['telegram'],
      sent: true
    });

    if (hitZone) {
      await Zone.findByIdAndUpdate(hitZone._id, {
        status: 'Hit',
        $inc: { hitCount: 1 },
        lastHitAt: new Date()
      });
    }

    req.app.get('io').emit('alert:new', alert);
    res.json({ received: true, alert });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
