const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { registerValidator, loginValidator } = require('../utils/validators');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = '7d';

// POST /api/auth/register
router.post('/register', registerValidator, async (req, res, next) => {
  try {
    const { name, email, password, birthDate, termsAccepted } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email is already registered' });

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      passwordHash,
      birthDate: new Date(birthDate),
      termsAccepted
    });

    const token = jwt.sign({ uid: user._id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        birthDate: user.birthDate,
        createdAt: user.createdAt
      },
      token
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', loginValidator, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ uid: user._id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        birthDate: user.birthDate,
        createdAt: user.createdAt
      },
      token
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
