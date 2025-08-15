# YouVibe Backend (MVP Full)
Run locally:
```
npm install
npm start
```
Env: PORT=10000, JWT_SECRET, ALLOWED_ORIGIN (set to your Netlify domain).
Endpoints: /auth/*, /me, /feed, /feed/live, /live/*, /live/donate, /wallet/*, /battles/*, /stories/*, /notifications, /health
WebSocket: /ws
Storage is in-memory (demo). Connect DB later for persistence.
