const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { UserToken } = require('../models');
const AppError = require('../utils/AppError');

const TTL = {
  INVITATION: 7 * 24 * 60 * 60 * 1000,
  RESET_PASSWORD: 60 * 60 * 1000,
};

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET manquant dans .env');
  return secret;
}

function signAccessToken(user) {
  return jwt.sign({ role: user.role }, jwtSecret(), {
    subject: String(user.id),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, jwtSecret());
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Cree un jeton a usage unique (invitation, reset...) et invalide les precedents du meme type.
// Retourne le jeton en clair : il n'est jamais stocke, seule son empreinte l'est.
async function issueUserToken(userId, type, { transaction } = {}) {
  await UserToken.destroy({ where: { userId, type, usedAt: null }, transaction });

  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + TTL[type]);
  await UserToken.create({ userId, type, tokenHash: hashToken(token), expiresAt }, { transaction });

  return { token, expiresAt };
}

// Verifie et consomme un jeton. Retourne l'id de l'utilisateur concerne.
async function consumeUserToken(token, type, { transaction } = {}) {
  const record = await UserToken.findOne({
    where: { tokenHash: hashToken(token), type },
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw AppError.badRequest('Lien invalide ou expire');
  }

  await record.update({ usedAt: new Date() }, { transaction });
  return record.userId;
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  issueUserToken,
  consumeUserToken,
};
