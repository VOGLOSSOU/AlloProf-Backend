const { Op } = require('sequelize');
const {
  sequelize, Demande, Assignation, Professeur, User, Ville, Niveau, Specialite,
} = require('../models');
const { notify } = require('../services/notificationService');
const q = require('../utils/query');
const AppError = require('../utils/AppError');

const LIBELLES_STATUT = {
  EN_ATTENTE: 'en attente',
  EN_RECHERCHE: 'en cours de recherche',
  REJETEE: 'rejetee',
};

async function list(req, res) {
  const { statut, villeId, page, limit } = req.query;
  const result = await Demande.findAndCountAll({
    where: { ...(statut && { statut }), ...(villeId && { villeId }) },
    include: [...q.detailsDemande(), q.clientAvecUser()],
    order: [['createdAt', 'DESC']],
    distinct: true,
    ...q.paginate({ page, limit }),
  });
  res.json(q.pageResponse(result, { page, limit }));
}

async function get(req, res) {
  const demande = await Demande.findByPk(req.params.id, {
    include: [
      ...q.detailsDemande(),
      q.clientAvecUser(),
      { model: User, as: 'admin', attributes: q.USER_PUBLIC },
      { model: Assignation, as: 'assignations', include: [q.professeurAvecUser(), q.creneaux()] },
    ],
    order: [[{ model: Assignation, as: 'assignations' }, 'createdAt', 'DESC']],
  });
  if (!demande) throw AppError.notFound('Demande introuvable');
  res.json(demande);
}

async function update(req, res) {
  const demande = await Demande.findByPk(req.params.id);
  if (!demande) throw AppError.notFound('Demande introuvable');
  if (['ASSIGNEE', 'ANNULEE'].includes(demande.statut) && req.body.statut) {
    throw AppError.conflict(`Une demande ${demande.statut.toLowerCase()} ne peut pas changer de statut ici`);
  }

  const changementStatut = req.body.statut && req.body.statut !== demande.statut;
  await sequelize.transaction(async (transaction) => {
    await demande.update({ ...req.body, traiteePar: req.user.id }, { transaction });
    if (changementStatut) {
      await notify(demande.clientId, {
        type: 'DEMANDE_STATUT',
        titre: 'Votre demande a ete mise a jour',
        message: `Votre demande #${demande.id} est maintenant ${LIBELLES_STATUT[demande.statut]}`,
        data: { demandeId: demande.id, statut: demande.statut },
      }, { transaction });
    }
  });
  res.json(demande);
}

// Profs disponibles qui couvrent la ville et le niveau de la demande et au moins
// une de ses specialites ; tries par nombre de specialites couvertes puis par charge
async function professeursCompatibles(req, res) {
  const demande = await Demande.findByPk(req.params.id, {
    include: [{ model: Specialite, as: 'specialites', through: q.sansLiaison() }],
  });
  if (!demande) throw AppError.notFound('Demande introuvable');
  const specialiteIds = demande.specialites.map((s) => s.id);

  const professeurs = await Professeur.findAll({
    where: { disponibilite: 'DISPONIBLE' },
    include: [
      { ...q.user(), where: { statut: 'ACTIF' } },
      { model: Ville, as: 'villes', through: q.sansLiaison(), where: { id: demande.villeId } },
      { model: Niveau, as: 'niveaux', through: q.sansLiaison(), where: { id: demande.niveauId } },
      { model: Specialite, as: 'specialites', through: q.sansLiaison(), where: { id: { [Op.in]: specialiteIds } } },
    ],
  });

  const charges = await Assignation.findAll({
    where: { statut: 'ACTIVE', professeurId: { [Op.in]: professeurs.map((p) => p.userId) } },
    attributes: ['professeurId', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
    group: ['professeurId'],
    raw: true,
  });
  const chargeParProf = new Map(charges.map((c) => [c.professeurId, Number(c.total)]));

  const result = professeurs
    .map((prof) => ({
      ...prof.toJSON(),
      specialitesCouvertes: prof.specialites.length,
      couvreTout: prof.specialites.length === specialiteIds.length,
      assignationsActives: chargeParProf.get(prof.userId) || 0,
    }))
    .sort((a, b) => b.specialitesCouvertes - a.specialitesCouvertes || a.assignationsActives - b.assignationsActives);

  res.json(result);
}

module.exports = { list, get, update, professeursCompatibles };
