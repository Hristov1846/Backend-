import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

dotenv.config();

const app = express();

/* ------------ CONFIG ------------- */
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  const tmp = nanoid(32);
  console.warn('[WARN] JWT_SECRET is not set. Using a random secret for this boot:', tmp);
  return tmp;
})();

// Разрешени фронт адреси (добави, ако смениш домейна)
const ALLOWED_ORIGINS = [
  'https://youvibe.netlify.app',
  'http://localhost:5173',
  'http://localhost:4173'
];

/* ------------ MIDDLEWARES ------------- */
app.use(morgan('tiny'));
app.use(express.json({ limit: '1mb' }));
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    return cb(null, ALLOWED_ORIGINS.includes(origin));
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: 'Content-Type,Authorization',
  credentials: true
}));
app.options('*', cors());

/* ------------ IN-MEMORY DATA (за тест) ------------- */
const db = {
  users: [], // {id,name,email,passwordHash, dob:{day,month,year}, createdAt}
  news: [
    { id: 'n1', title: 'Welcome to YouVibe', body: 'Официално стартиране на платформата.', ts: Date.now() - 86400000 },
    { id: 'n2', title: 'Live Battles', body: 'Нов формат за битки с дарения в реално време.', ts: Date.now() - 43200000 },
  ],
  live: [
    // пример: { id:'l1', user:'DJ Ghost', title:'Sunset Vibes', viewers: 1543, startedAt: Date.now()-120000 }
  ],
  donations: [] // {id, userId, amount, currency, ts}
};

/* ------------ HELPERS ------------- */
function signToken(payload, opts = {}) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d', ...opts });
}

function authRequired(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (e) {
    return res.status(401).json({ ok: false, error: 'Invalid token' });
  }
}

/* ------------ HEALTH ------------- */
app.get('/', (req, res) => {
  res.json({
    name: 'YouVibe API',
    ok: true,
    env: {
      node: process.version,
      hasJWT: Boolean(process.env.JWT_SECRET)
    }
  });
});
app.get('/healthz', (req, res) => res.json({ ok: true }));

/* ------------ AUTH ------------- */
// Регистрация
app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, day, month, year } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ ok: false, error: 'Missing fields' });
    }
    const exists = db.users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
    if (exists) {
      return res.status(409).json({ ok: false, error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = {
      id: nanoid(12),
      name,
      email,
      passwordHash,
      dob: { day, month, year },
      createdAt: Date.now()
    };
    db.users.push(user);

    const token = signToken({ id: user.id, email: user.email, name: user.name });
    res.status(201).json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email },
      token
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// Логин
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Missing fields' });
    }
    const user = db.users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
    if (!user) return res.status(401).json({ ok: false, error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ ok: false, error: 'Invalid credentials' });

    const token = signToken({ id: user.id, email: user.email, name: user.name });
    res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email }, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// Проверка на токен / профил
app.get('/auth/me', authRequired, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
  res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email } });
});

/* ------------ NEWS / LIVE ------------- */
app.get('/news', (req, res) => {
  res.json({ ok: true, items: db.news.sort((a, b) => b.ts - a.ts) });
});

app.get('/live', (req, res) => {
  res.json({ ok: true, items: db.live });
});

/* ------------ DONATIONS (mock) ------------- */
app.post('/donations/checkout', authRequired, (req, res) => {
  const { amount, currency = 'EUR' } = req.body || {};
  const num = Number(amount);
  if (!num || num <= 0) return res.status(400).json({ ok: false, error: 'Invalid amount' });

  const donation = {
    id: nanoid(10),
    userId: req.user.id,
    amount: num,
    currency,
    ts: Date.now()
  };
  db.donations.push(donation);

  // Тук по-късно ще вържем реален провайдър (PayPal/Stripe)
  res.status(201).json({ ok: true, donation, next: 'payment_provider_mock' });
});

/* ------------ 404 & ERROR HANDLERS ------------- */
app.use((req, res) => res.status(404).json({ ok: false, error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ ok: false, error: 'Server error' });
});

/* ------------ START ------------- */
app.listen(PORT, () => {
  console.log(`YouVibe API running on :${PORT}`);
});
