const { Op } = require('sequelize');
const {
  sequelize, User, Professeur, Specialite, Ville, Niveau, Assignation,
} = require('../models');
const { issueUserToken } = require('../services/tokenService');
const { assertActiveIds } = require('../services/referentielService');
const emailService = require('../services/emailService');
const { findUserWithProfile } = require('./authController');
const q = require('../utils/query');
const AppError = require('../utils/AppError');

// compteActive = le prof a choisi son mot de passe (invitation acceptee)
const userAvecActivation = () => ({
  ...q.user(),
  attributes: [...q.USER_PUBLIC, [sequelize.literal('`user`.`password_hash` IS NOT NULL'), 'compteActive']],
});

// Filtre "le prof est lie a cet element" sans tronquer la liste renvoyee
function lieA(table, colonne, id) {
  return sequelize.literal(
    `\`Professeur\`.\`user_id\` IN (SELECT professeur_id FROM ${table} WHERE ${colonne} = ${sequelize.escape(id)})`,
  );
}

async function assertReferentiels({ specialiteIds, villeIds, niveauIds }) {
  if (specialiteIds) await assertActiveIds(Specialite, specialiteIds, 'specialiteIds');
  if (villeIds) await assertActiveIds(Ville, villeIds, 'villeIds');
  if (niveauIds) await assertActiveIds(Niveau, niveauIds, 'niveauIds');
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

async function list(req, res) {
  const {
    q: recherche, disponibilite, villeId, specialiteId, niveauId, page, limit,
  } = req.query;

  const filtres = [
    villeId && lieA('professeur_villes', 'ville_id', villeId),
    specialiteId && lieA('professeur_specialites', 'specialite_id', specialiteId),
    niveauId && lieA('professeur_niveaux', 'niveau_id', niveauId),
  ].filter(Boolean);

  const like = recherche && { [Op.like]: `%${recherche}%` };

  // 1) ids tries et pagines (jointure 1-1 uniquement : le tri sur user.nom reste possible)
  // 2) details de ces profs. En une seule requete, Sequelize place la pagination dans une
  //    sous-requete a cause des relations N-N et ne peut plus trier sur user.nom.
  const page1 = await Professeur.findAndCountAll({
    where: { ...(disponibilite && { disponibilite }), ...(filtres.length && { [Op.and]: filtres }) },
    attributes: ['userId'],
    include: [{
      model: User,
      as: 'user',
      attributes: [],
      ...(like && { where: { [Op.or]: [{ nom: like }, { prenom: like }, { email: like }, { telephone: like }] } }),
    }],
    order: [[{ model: User, as: 'user' }, 'nom', 'ASC'], [{ model: User, as: 'user' }, 'prenom', 'ASC']],
    ...q.paginate({ page, limit }),
  });

  const ids = page1.rows.map((row) => row.userId);
  const details = await Professeur.findAll({
    where: { userId: { [Op.in]: ids } },
    include: [userAvecActivation(), ...q.referentielsProf()],
  });
  const parId = new Map(details.map((prof) => [prof.userId, prof]));

  res.json(q.pageResponse({ rows: ids.map((id) => parId.get(id)), count: page1.count }, { page, limit }));
}

async function get(req, res) {
  const professeur = await Professeur.findByPk(req.params.id, {
    include: [
      userAvecActivation(),
      ...q.referentielsProf(),
      { model: Assignation, as: 'assignations', include: [q.demandeComplete(), q.creneaux()] },
    ],
    order: [[{ model: Assignation, as: 'assignations' }, 'dateDebut', 'DESC']],
  });
  if (!professeur) throw AppError.notFound('Professeur introuvable');
  res.json(professeur);
}

async function create(req, res) {
  const { specialiteIds, villeIds, niveauIds, bio, ...data } = req.body;
  await assertReferentiels(req.body);

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

async function update(req, res) {
  const professeur = await Professeur.findByPk(req.params.id, { include: [{ model: User, as: 'user' }] });
  if (!professeur) throw AppError.notFound('Professeur introuvable');

  const {
    nom, prenom, email, telephone, bio, disponibilite, specialiteIds, villeIds, niveauIds,
  } = req.body;
  await assertReferentiels(req.body);

  await sequelize.transaction(async (transaction) => {
    await professeur.user.update(q.defined({ nom, prenom, email, telephone }), { transaction });
    await professeur.update(q.defined({ bio, disponibilite }), { transaction });
    if (specialiteIds) await professeur.setSpecialites(specialiteIds, { transaction });
    if (villeIds) await professeur.setVilles(villeIds, { transaction });
    if (niveauIds) await professeur.setNiveaux(niveauIds, { transaction });
  });

  res.json(await findUserWithProfile(professeur.userId));
}

async function resendInvitation(req, res) {
  const user = await User.findOne({ where: { id: req.params.id, role: 'PROFESSEUR' } });
  if (!user) throw AppError.notFound('Professeur introuvable');
  if (user.passwordHash) throw AppError.conflict('Ce professeur a deja active son compte');

  const invitation = await issueUserToken(user.id, 'INVITATION');
  res.json({ invitation: await sendInvitation(user, invitation) });
}

module.exports = { list, get, create, update, resendInvitation };
