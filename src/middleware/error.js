module.exports = function errorHandler(err, req, res, next) {
  console.error(err);

  // Duplicate key (unique email)
  if (err && err.code === 11000) {
    return res.status(409).json({ error: 'Email is already registered' });
  }

  // Joi/Celebrate already handled above, but just in case:
  if (err && err.joi) {
    return res.status(400).json({ error: err.joi.message });
  }

  res.status(500).json({ error: 'Server error' });
};
