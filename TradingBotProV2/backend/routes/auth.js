const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const mongoose= require('mongoose');

// Simple User model inline (single user app)
const UserSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name:     { type: String }
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password: hash, name });
  res.json({ message: 'Account created', userId: user._id });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !await bcrypt.compare(password, user.password))
    return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
});

module.exports = router;
