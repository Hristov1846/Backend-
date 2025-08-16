const { Schema, model } = require('mongoose');

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    birthDate: { type: Date, required: true },
    termsAccepted: { type: Boolean, required: true, default: false }
  },
  { timestamps: true }
);

// Уникален индекс по email (ако има дубликат от стари миграции, дропни стария индекс през Atlas)
userSchema.index({ email: 1 }, { unique: true });

module.exports = model('User', userSchema);
