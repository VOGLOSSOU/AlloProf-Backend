const { sequelize, User, Client, Professeur } = require('../models');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signAccessToken, issueUserToken, consumeUserToken } = require('../services/tokenService');
const emailService = require('../services/emailService');
const { telephone: telephoneSchema } = require('../validators/common');
const q = require('../utils/query');
const AppError = require('../utils/AppError');

// Utilisateur + son profil (client ou professeur avec ses referentiels)
function findUserWithProfile(id) {
  return User.findByPk(id, {
    include: [
      { model: Client, as: 'client' },
      { model: Professeur, as: 'professeur', include: q.referentielsProf() },
    ],
  });
}

async function sessionResponse(userId) {
  const user = await findUserWithProfile(userId);
  return { token: signAccessToken(user), user };
}

async function register(req, res) {
  const { password, adresse, ...data } = req.body;
  const passwordHash = await hashPassword(password);

  const user = await sequelize.transaction(async (transaction) => {
    const created = await User.create({ ...data, role: 'CLIENT', passwordHash }, { transaction });
    await Client.create({ userId: created.id, adresse }, { transaction });
    return created;
  });

  res.status(201).json(await sessionResponse(user.id));
}

async function login(req, res) {
  const { identifiant, password } = req.body;

  const where = identifiant.includes('@')
    ? { email: identifiant.toLowerCase() }
    : { telephone: telephoneSchema.safeParse(identifiant).data ?? identifiant };
  const user = await User.findOne({ where });

  // Message identique que le compte existe ou non
  const ok = await verifyPassword(password, user?.passwordHash);
  if (!ok) throw AppError.unauthorized('Identifiants incorrects');
  if (user.statut !== 'ACTIF') throw AppError.forbidden('Compte suspendu');

  res.json(await sessionResponse(user.id));
}

async function me(req, res) {
  res.json(await findUserWithProfile(req.user.id));
}

async function setPassword(user, password, transaction) {
  await user.update({
    passwordHash: await hashPassword(password),
    passwordChangedAt: new Date(),
    mustChangePassword: false,
  }, { transaction });
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  const ok = await verifyPassword(currentPassword, req.user.passwordHash);
  if (!ok) throw AppError.badRequest('Mot de passe actuel incorrect');

  await setPassword(req.user, newPassword);
  // Les anciens jetons sont invalides : on renvoie une nouvelle session
  res.json(await sessionResponse(req.user.id));
}

async function forgotPassword(req, res) {
  const user = await User.findOne({ where: { email: req.body.email, statut: 'ACTIF' } });

  if (user) {
    const { token } = await issueUserToken(user.id, 'RESET_PASSWORD');
    // Pas d'await : le temps de reponse ne doit pas reveler si l'email existe
    emailService.sendPasswordReset(user, token).catch((err) => console.error('Email reset :', err));
  }

  res.json({ message: 'Si un compte existe avec cet email, un lien de reinitialisation a ete envoye' });
}

async function resetPassword(req, res) {
  await sequelize.transaction(async (transaction) => {
    const userId = await consumeUserToken(req.body.token, 'RESET_PASSWORD', { transaction });
    const user = await User.findByPk(userId, { transaction });
    await setPassword(user, req.body.password, transaction);
  });

  res.json({ message: 'Mot de passe modifie, vous pouvez vous connecter' });
}

async function acceptInvitation(req, res) {
  const userId = await sequelize.transaction(async (transaction) => {
    const id = await consumeUserToken(req.body.token, 'INVITATION', { transaction });
    const user = await User.findByPk(id, { transaction });
    if (user.statut !== 'ACTIF') throw AppError.forbidden('Compte suspendu');
    await setPassword(user, req.body.password, transaction);
    return id;
  });

  res.json(await sessionResponse(userId));
}

module.exports = {
  findUserWithProfile,
  register,
  login,
  me,
  changePassword,
  forgotPassword,
  resetPassword,
  acceptInvitation,
};
