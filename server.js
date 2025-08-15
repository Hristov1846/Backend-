import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";

const app = express();
const PORT = process.env.PORT || 3000;

// позволени фронтенд домейни (сложи точния си Netlify домейн)
const allowed = new Set([
  "https://youvibe.netlify.app",
  "http://localhost:5173",
  "http://localhost:5500"
]);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowed.has(origin)) return cb(null, true);
    return cb(new Error("CORS blocked: " + origin), false);
  },
  credentials: true
}));

app.use(express.json());

// Health & root
app.get("/health", (req, res) => res.json({ ok: true, ts: Date.now() }));
app.get("/", (req, res) => res.json({ name: "YouVibe API", ok: true }));

// In-memory "db" (демо)
const users = new Map(); // email -> {name,email,password,dob}
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// Register
app.post("/auth/register", (req, res) => {
  const { name, email, password, dob } = req.body || {};
  if (!name || !email || !password || !dob?.day || !dob?.month || !dob?.year) {
    return res.status(400).json({ message: "missing fields" });
  }
  if (users.has(email)) return res.status(409).json({ message: "email exists" });
  users.set(email, { name, email, password, dob });
  return res.status(201).json({ ok: true });
});

// Login
app.post("/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  const u = users.get(email);
  if (!u || u.password !== password) {
    return res.status(401).json({ message: "invalid credentials" });
  }
  const token = jwt.sign({ sub: email, name: u.name }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token });
});

// Пример защитен ендпойнт
app.get("/me", (req, res) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: "missing token" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const u = users.get(payload.sub);
    res.json({ user: { name: u?.name, email: u?.email } });
  } catch {
    res.status(401).json({ message: "invalid token" });
  }
});

app.listen(PORT, () => {
  console.log("YouVibe API listening on", PORT);
});
