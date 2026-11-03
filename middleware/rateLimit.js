const { rateLimit } = require('express-rate-limit');

// Routes sensibles (connexion, reset...) : 10 essais / 15 min / IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'Trop de tentatives, reessayez dans quelques minutes' },
});

module.exports = { authLimiter };
