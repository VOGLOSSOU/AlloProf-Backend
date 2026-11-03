const { Op } = require('sequelize');
const { sequelize, User, Professeur, Specialite, Ville, Niveau } = require('../models');
const { issueUserToken } = require('../services/tokenService');
const emailService = require('../services/emailService');
const { findUserWithProfile } = require('./authController');
const AppError = require('../utils/AppError');

// Verifie que tous les ids existent et sont actifs dans le referentiel
async function assertActiveIds(Model, ids, champ) {
  const found = await Model.findAll({ where: { id: { [Op.in]: ids }, estActive: true }, attributes: ['id'] });
  const foundIds = new Set(found.map((row) => row.id));
  const missing = ids.filter((id) => !foundIds.has(id));
  if (missing.length) {
    throw AppError.badRequest('Donnees invalides', [{ champ, message: `Inexistants ou desactives : ${missing.join(', ')}` }]);
  }
}

// Envoie l'invitation par email et renvoie aussi le lien a l'admin,
// pour qu'il puisse le transmettre lui-meme (WhatsApp, SMS...)
async function sendInvitation(user, { token, expiresAt }) {
  let emailEnvoye = false;
  try {
    emailEnvoye = await emailService.sendInvitation(user, token);
  } catch (err) {
    console.error('Email invitation :', err);
  }
  return { lien: emailService.invitationLink(token), expireLe: expiresAt, emailEnvoye };
}

async function create(req, res) {
  const { specialiteIds, villeIds, niveauIds, bio, ...data } = req.body;

  await assertActiveIds(Specialite, specialiteIds, 'specialiteIds');
  await assertActiveIds(Ville, villeIds, 'villeIds');
  await assertActiveIds(Niveau, niveauIds, 'niveauIds');

  const { user, invitation } = await sequelize.transaction(async (transaction) => {
    const created = await User.create({ ...data, role: 'PROFESSEUR', passwordHash: null }, { transaction });
    const professeur = await Professeur.create({ userId: created.id, bio }, { transaction });
    await professeur.setSpecialites(specialiteIds, { transaction });
    await professeur.setVilles(villeIds, { transaction });
    await professeur.setNiveaux(niveauIds, { transaction });
    return { user: created, invitation: await issueUserToken(created.id, 'INVITATION', { transaction }) };
  });

  res.status(201).json({
    professeur: await findUserWithProfile(user.id),
    invitation: await sendInvitation(user, invitation),
  });
}

async function resendInvitation(req, res) {
  const user = await User.findOne({ where: { id: req.params.id, role: 'PROFESSEUR' } });
  if (!user) throw AppError.notFound('Professeur introuvable');
  if (user.passwordHash) throw AppError.conflict('Ce professeur a deja active son compte');

  const invitation = await issueUserToken(user.id, 'INVITATION');
  res.json({ invitation: await sendInvitation(user, invitation) });
}

module.exports = { create, resendInvitation };
