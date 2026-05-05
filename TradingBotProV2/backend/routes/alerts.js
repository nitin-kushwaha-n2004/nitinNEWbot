const router = require('express').Router();
const Alert = require('../models/Alert');
const { sendTelegramAlert, sendEmail } = require('../controllers/notificationController');

router.get('/', async (req, res) => {
  const alerts = await Alert.find().sort({ createdAt: -1 }).limit(50).populate('zoneId tradeId');
  res.json(alerts);
});

// POST — manually send a test alert
router.post('/test', async (req, res) => {
  try {
    await sendTelegramAlert('✅ Trading Bot Pro — Test alert! Bot is connected and working.');
    res.json({ message: 'Test alert sent via Telegram' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
