import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import morgan from 'morgan';

import authRoutes from './src/routes/auth.js';

const app = express();

// ===== Config =====
const PORT = process.env.PORT || 10000;
const ORIGIN = process.env.CORS_ORIGIN || '*';

// CORS (разрешаваме фронтенда от Netlify)
app.use(
  cors({
    origin: ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

// ===== MongoDB =====
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('Missing MONGO_URI');
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, { dbName: 'youvibe' })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('Mongo error:', err.message);
    process.exit(1);
  });

// ===== Routes =====
app.get('/', (req, res) => {
  res.json({ name: 'YouVibe API', ok: true });
});

app.get('/health', (req, res) => {
  res.json({ ok: true, status: 'healthy' });
});

app.use('/auth', authRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ ok: false, message: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('API error:', err);
  res.status(500).json({ ok: false, message: 'Server error' });
});

app.listen(PORT, () => {
  console.log(`YouVibe API running on :${PORT}`);
});
