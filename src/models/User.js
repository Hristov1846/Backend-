const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, trim: true, required: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  passwordHash: { type: String, required: true },
  birthDate: { type: Date, required: true },
  termsAccepted: { type: Boolean, required: true },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
