// server.js  — CommonJS (require), готов за Render
const cors = require('cors');

app.use(cors({
  origin: [
    'https://youvibe.netlify.app',
    'http://localhost:5173'
  ],
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
}));

app.options('*', cors());
app.use(express.json({ limit: '1mb' }));
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

// ---- ENV ----
const PORT = process.env.PORT || 10000;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || "change-me";

// ---- Middlewares ----
app.use(
  cors({
    origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : "*",
    credentials: true,
  })
);
app.use(express.json());

// ---- Health / Root ----
app.get("/", (req, res) => {
  res.json({ name: "YouVibe API", ok: true });
});
app.get("/health", (req, res) => res.status(200).send("ok"));

// ---- Mongo ----
mongoose.set("strictQuery", true);
mongoose
  .connect(MONGODB_URI, { dbName: "youvibe" })
  .then(() => console.log("✅ Mongo connected"))
  .catch((err) => {
    console.error("❌ Mongo connection error:", err.message);
    process.exit(1);
  });

// ---- User model ----
const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    email: { type: String, trim: true, required: true, unique: true },
    passwordHash: { type: String, required: true },
    dob: { type: Date },
  },
  { timestamps: true }
);
// ВАЖНО: Няма отделен schema.index за email, за да избегнем duplicate index warning.
const User = mongoose.model("User", userSchema);

// ---- Auth routes ----

// POST /auth/register  {name, email, password, dob?}
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password, dob } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ ok: false, error: "Missing fields" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ ok: false, error: "Email exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      dob: dob ? new Date(dob) : undefined,
    });

    return res.status(201).json({ ok: true, user: { id: user._id, name, email } });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ ok: false, error: "Email exists" });
    }
    console.error("Register error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// POST /auth/login  {email, password}
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "Missing fields" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ ok: false, error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ ok: false, error: "Invalid credentials" });

    const token = jwt.sign({ uid: user._id }, JWT_SECRET, { expiresIn: "7d" });
    return res.json({ ok: true, token, user: { id: user._id, name: user.name, email } });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ---- Start ----
app.listen(PORT, () => {
  console.log(`🚀 YouVibe API on :${PORT}`);
});
