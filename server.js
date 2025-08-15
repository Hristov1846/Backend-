// server.js
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

// ==== CORS ====
app.use(cors({
  origin: [
    "https://youvibe.netlify.app",
    "http://localhost:5173"
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.options("*", cors());

// ==== Body parser ====
app.use(express.json({ limit: "1mb" }));

// ==== MongoDB Connect ====
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));

// ==== User Schema ====
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  birthDate: String
});

const User = mongoose.model("User", userSchema);

// ==== Routes ====

// Test route
app.get("/", (req, res) => {
  res.send("YouVibe API е активен 🚀");
});

// Регистрация
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, birthDate } = req.body;
    if (!name || !email || !password || !birthDate) {
      return res.status(400).json({ message: "Всички полета са задължителни" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Имейлът вече е регистриран" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword, birthDate });
    await newUser.save();

    res.status(201).json({ message: "Регистрацията е успешна" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Сървърна грешка" });
  }
});

// Вход
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Попълни всички полета" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Невалидни данни" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Невалидни данни" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({ message: "Вход успешен", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Сървърна грешка" });
  }
});

// ==== Start Server ====
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
