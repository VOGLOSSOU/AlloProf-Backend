const { User } = require('../models');
const { verifyAccessToken } = require('../services/tokenService');
const AppError = require('../utils/AppError');

async function authenticate(req, res, next) {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw AppError.unauthorized();

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw AppError.unauthorized('Session invalide ou expiree');
  }

  const user = await User.findByPk(payload.sub);
  if (!user) throw AppError.unauthorized('Session invalide ou expiree');
  if (user.statut !== 'ACTIF') throw AppError.forbidden('Compte suspendu');

  // Mot de passe change depuis l'emission du jeton : on force une reconnexion
  if (user.passwordChangedAt && payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
    throw AppError.unauthorized('Session expiree, reconnectez-vous');
  }

  req.user = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) throw AppError.forbidden();
    next();
  };
}

module.exports = { authenticate, requireRole };
