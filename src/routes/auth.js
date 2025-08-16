const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

// helper – прави ISO дата от "YYYY-MM-DD"
function toISODate(str) {
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date');
  return d;
}

// POST /api/auth/register
// body: { name, email, password, birthDate: "YYYY-MM-DD", termsAccepted: true }
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, birthDate, termsAccepted } = req.body || {};

    if (!name || !email || !password || !birthDate)
      return res.status(400).json({ error: 'Missing fields' });

    if (!termsAccepted)
      return res.status(400).json({ error: 'Terms not accepted' });

    if (password.length < 8)
      return res.status(400).json({ error: 'Password too short' });

    // възраст >= 16
    const bd = toISODate(birthDate);
    const now = new Date();
    const age =
      now.getFullYear() -
      bd.getFullYear() -
      (now < new Date(now.getFullYear(), bd.getMonth(), bd.getDate()) ? 1 : 0);
    if (age < 16) return res.status(400).json({ error: 'Must be 16+ years old' });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      birthDate: bd,
      termsAccepted: true
    });

    const token = jwt.sign({ uid: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      ok: true,
      user: { id: user._id, name: user.name, email: user.email },
      token
    });
  } catch (err) {
    // дублиран email
    if (err && err.code === 11000) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
// body: { email, password }
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ uid: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      ok: true,
      user: { id: user._id, name: user.name, email: user.email },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
