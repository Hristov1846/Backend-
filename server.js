import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import morgan from 'morgan';

import authRoutes from './src/routes/auth.js';

const app = express();

/* ===== Config ===== */
const PORT = process.env.PORT || 10000;
const ORIGIN = process.env.CORS_ORIGIN || 'https://youvibe.netlify.app';
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ Missing MONGO_URI env var');
  process.exit(1);
}

/* ===== Middlewares ===== */
app.use(morgan('tiny'));
app.use(express.json({ limit: '1mb' }));
app.use(cors({
  origin: ORIGIN,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: false
}));
app.options('*', cors());

/* ===== MongoDB ===== */
mongoose.connect(MONGO_URI, { dbName: 'youvibe' })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => { console.error('❌ Mongo error:', err.message); process.exit(1); });

/* ===== Routes ===== */
app.get('/', (req, res) => res.json({ name: 'YouVibe API', ok: true }));
app.get('/health', (req, res) => res.json({ ok: true, status: 'healthy' }));

app.use('/auth', authRoutes);

/* 404 */
app.use((req, res) => res.status(404).json({ ok: false, message: 'Not found' }));

/* Error handler */
app.use((err, req, res, next) => {
  console.error('API error:', err);
  res.status(500).json({ ok: false, message: 'Server error' });
});

/* Start */
app.listen(PORT, () => console.log(`🚀 YouVibe API on :${PORT}`));
