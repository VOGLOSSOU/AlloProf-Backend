const { Op } = require('sequelize');
const {
  sequelize, Demande, Ville, Niveau, Specialite, Assignation, Seance, Paiement,
} = require('../models');
const { assertActiveIds } = require('../services/referentielService');
const { notifyAdmins } = require('../services/notificationService');
const { ensureCode } = require('../services/seanceService');
const q = require('../utils/query');
const { today, monthBounds } = require('../utils/dates');
const AppError = require('../utils/AppError');

// Assignation visible par le client : prof (coordonnees) + planning, sans les tarifs prof
const assignationPourClient = () => ({
  model: Assignation,
  as: 'assignations',
  attributes: ['id', 'statut', 'dateDebut', 'dateFin', 'uniteTarif', 'tarifClient'],
  include: [q.professeurAvecUser(), q.creneaux()],
});

function findDemande(id, clientId) {
  return Demande.findOne({
    where: { id, clientId },
    include: [...q.detailsDemande(), assignationPourClient()],
    order: [[{ model: Assignation, as: 'assignations' }, 'createdAt', 'DESC']],
  });
}

async function createDemande(req, res) {
  const { specialiteIds, ...data } = req.body;
  await assertActiveIds(Ville, data.villeId, 'villeId');
  await assertActiveIds(Niveau, data.niveauId, 'niveauId');
  await assertActiveIds(Specialite, specialiteIds, 'specialiteIds');

  const demande = await sequelize.transaction(async (transaction) => {
    const created = await Demande.create({ ...data, clientId: req.user.id }, { transaction });
    await created.setSpecialites(specialiteIds, { transaction });
    await notifyAdmins({
      type: 'NOUVELLE_DEMANDE',
      titre: 'Nouvelle demande de professeur',
      message: `${req.user.prenom} ${req.user.nom} a soumis une demande`,
      data: { demandeId: created.id },
    }, { transaction });
    return created;
  });

  res.status(201).json(await findDemande(demande.id, req.user.id));
}

async function listDemandes(req, res) {
  const { statut, page, limit } = req.query;
  const result = await Demande.findAndCountAll({
    where: { clientId: req.user.id, ...(statut && { statut }) },
    include: q.detailsDemande(),
    order: [['createdAt', 'DESC']],
    distinct: true,
    ...q.paginate({ page, limit }),
  });
  res.json(q.pageResponse(result, { page, limit }));
}

async function getDemande(req, res) {
  const demande = await findDemande(req.params.id, req.user.id);
  if (!demande) throw AppError.notFound('Demande introuvable');
  res.json(demande);
}

async function annulerDemande(req, res) {
  const demande = await Demande.findOne({ where: { id: req.params.id, clientId: req.user.id } });
  if (!demande) throw AppError.notFound('Demande introuvable');
  if (!['EN_ATTENTE', 'EN_RECHERCHE'].includes(demande.statut)) {
    throw AppError.conflict("Cette demande ne peut plus etre annulee, contactez l'administrateur");
  }

  await sequelize.transaction(async (transaction) => {
    await demande.update({ statut: 'ANNULEE' }, { transaction });
    await notifyAdmins({
      type: 'DEMANDE_ANNULEE',
      titre: 'Demande annulee par le client',
      message: `La demande #${demande.id} a ete annulee par le client`,
      data: { demandeId: demande.id },
    }, { transaction });
  });
  res.json(demande);
}

// Assignations du client : via ses demandes
const assignationsDuClient = (clientId) => ({
  model: Assignation,
  as: 'assignation',
  attributes: ['id', 'statut', 'demandeId', 'professeurId'],
  required: true,
  include: [
    { model: Demande, as: 'demande', attributes: [], where: { clientId }, required: true },
    q.professeurAvecUser(),
  ],
});

async function calendrier(req, res) {
  const { annee, mois, assignationId } = req.query;
  const { debut, fin } = monthBounds({ annee, mois });
  const seances = await Seance.findAll({
    where: { dateSeance: { [Op.between]: [debut, fin] }, ...(assignationId && { assignationId }) },
    include: [assignationsDuClient(req.user.id)],
    order: [['dateSeance', 'ASC'], ['heureDebut', 'ASC']],
  });
  res.json(seances);
}

// Seances du jour avec leur code secret, a transmettre au prof
async function seancesDuJour(req, res) {
  const seances = await Seance.findAll({
    where: { dateSeance: today(), statut: 'PREVUE' },
    include: [{ ...assignationsDuClient(req.user.id), where: { statut: 'ACTIVE' } }],
    order: [['heureDebut', 'ASC']],
  });

  const result = [];
  for (const seance of seances) {
    const withCode = await ensureCode(seance);
    result.push({ ...withCode.toJSON(), codeSecret: withCode.codeSecret });
  }
  res.json(result);
}

async function paiements(req, res) {
  const { page, limit } = req.query;
  const result = await Paiement.findAndCountAll({
    where: { sens: 'CLIENT_VERS_ADMIN' },
    include: [assignationsDuClient(req.user.id)],
    order: [['annee', 'DESC'], ['mois', 'DESC'], ['createdAt', 'DESC']],
    distinct: true,
    ...q.paginate({ page, limit }),
  });
  res.json(q.pageResponse(result, { page, limit }));
}

module.exports = {
  createDemande, listDemandes, getDemande, annulerDemande, calendrier, seancesDuJour, paiements,
};
