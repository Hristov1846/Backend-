import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, day, month, year } = req.body || {};
    if (!name || !email || !password || !day || !month || !year) {
      return res.status(400).json({ ok: false, message: 'Missing fields' });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(409).json({ ok: false, message: 'Email is already registered' });
    }

    const birthDate = new Date(Number(year), Number(month) - 1, Number(day));
    if (isNaN(birthDate.getTime())) {
      return res.status(400).json({ ok: false, message: 'Invalid birth date' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash, birthDate });

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.status(201).json({
      ok: true,
      user: { id: user._id, name: user.name, email: user.email },
      token
    });
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ ok: false, message: 'Missing fields' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ ok: false, message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ ok: false, message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.json({
      ok: true,
      user: { id: user._id, name: user.name, email: user.email },
      token
    });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// GET /auth/me (protected)
router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).select('_id name email createdAt');
  if (!user) return res.status(404).json({ ok: false, message: 'User not found' });
  res.json({ ok: true, user });
});

export default router;
