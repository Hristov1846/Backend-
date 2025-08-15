// server.js – Backend за YouVibe

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ---- ENV ----
const PORT = process.env.PORT || 10000;
const MONGODB_URI = process.env.MONGODB_URI;

// Свързване с MongoDB
mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Модел за потребители
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  birthDate: String,
});
const User = mongoose.model("User", UserSchema);

// Health check за Render
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Регистрация
app.post("/register", async (req, res) => {
  try {
    const { name, email, password, birthDate } = req.body;

    if (!name || !email || !password || !birthDate) {
      return res.status(400).json({ error: "Всички полета са задължителни" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      birthDate,
    });
    await newUser.save();

    res.json({ message: "Регистрацията е успешна!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Грешка при регистрация" });
  }
});

// Вход
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: "Невалиден имейл или парола" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Невалиден имейл или парола" });
    }

    const token = jwt.sign({ userId: user._id }, "SECRET_KEY", {
      expiresIn: "1d",
    });

    res.json({ message: "Успешен вход", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Грешка при вход" });
  }
});

// Стартиране на сървъра
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
