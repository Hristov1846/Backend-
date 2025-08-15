const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors({ origin: ['https://youvibe.netlify.app', 'http://localhost:5173'] }));

// Health check — връща 200
app.get('/health', (req, res) => {
  res.status(200).json({ ok: true, status: 'YouVibe API running' });
});

// коренът е по избор
app.get('/', (req, res) => res.json({ name: 'YouVibe API', ok: true }));

const PORT = process.env.PORT || 10000; // Render ще подаде PORT
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API listening on ${PORT}`);
});
