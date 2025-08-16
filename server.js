// server.js — чист Express + Mongoose (без deprecated опции)
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');

// ---- ENV ----
const PORT = process.env.PORT || 10000;
// Пример: mongodb+srv://Youvibe_admin:<парола>@youvibe.kkcq2sr.mongodb.net/?retryWrites=true&w=majority&appName=Youvibe
const MONGODB_URI = process.env.MONGODB_URI;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set!');
  process.exit(1);
}

// ---- APP ----
const app = express();

// CORS
app.use(
  cors({
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(','),
    credentials: false
  })
);

// Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

// Health endpoints (за Render health check)
app.get('/', (req, res) => res.send('YouVibe API is up.'));
app.get('/health', (req, res) => res.status(200).json({ ok: true }));

// API routes
app.use('/api/auth', authRoutes);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ---- DB + START ----
async function start() {
  try {
    // В Mongoose 8 не трябват useNewUrlParser/useUnifiedTopology
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Mongo connect error:', err.message);
    process.exit(1);
  }
}

start();
