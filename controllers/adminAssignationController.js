const { Op } = require('sequelize');
const {
  sequelize, Assignation, CreneauHebdo, Demande, Professeur, User, Seance, Paiement,
} = require('../models');
const planning = require('../services/planningService');
const { recapMensuel } = require('../services/paiementService');
const { notify } = require('../services/notificationService');
const q = require('../utils/query');
const { today } = require('../utils/dates');
const AppError = require('../utils/AppError');

const MOTIF_SUSPENSION = 'Assignation suspendue';
const MOTIF_FIN = 'Assignation terminee';

function findAssignation(id, { transaction } = {}) {
  return Assignation.findByPk(id, {
    include: [q.demandeComplete(), q.professeurAvecUser(), q.creneaux()],
    order: q.ORDRE_CRENEAUX,
    transaction,
  });
}

async function findOr404(id) {
  const assignation = await Assignation.findByPk(id, { include: [{ model: Demande, as: 'demande' }] });
  if (!assignation) throw AppError.notFound('Assignation introuvable');
  return assignation;
}

function notifierParties(assignation, notification, { transaction } = {}) {
  return notify(
    [assignation.professeurId, assignation.demande.clientId],
    { ...notification, data: { assignationId: assignation.id, demandeId: assignation.demandeId } },
    { transaction },
  );
}

async function create(req, res) {
  const { creneaux, ...data } = req.body;

  const demande = await Demande.findByPk(data.demandeId);
  if (!demande) throw AppError.notFound('Demande introuvable');
  if (!['EN_ATTENTE', 'EN_RECHERCHE', 'ASSIGNEE'].includes(demande.statut)) {
    throw AppError.conflict(`Impossible d'assigner une demande ${demande.statut.toLowerCase()}`);
  }
  const active = await Assignation.findOne({ where: { demandeId: demande.id, statut: 'ACTIVE' } });
  if (active) {
    throw AppError.conflict(`Cette demande a deja une assignation active (#${active.id}) : terminez-la d'abord`);
  }

  const professeur = await Professeur.findByPk(data.professeurId, { include: [{ model: User, as: 'user' }] });
  if (!professeur) throw AppError.notFound('Professeur introuvable');
  if (professeur.user.statut !== 'ACTIF') throw AppError.conflict('Le compte de ce professeur est suspendu');
  if (professeur.disponibilite !== 'DISPONIBLE') throw AppError.conflict("Ce professeur est marque indisponible");

  planning.assertNoInternalOverlap(creneaux);

  const id = await sequelize.transaction(async (transaction) => {
    await planning.assertNoProfConflict({ ...data, creneaux }, { transaction });

    const assignation = await Assignation.create(data, { transaction });
    assignation.creneaux = await CreneauHebdo.bulkCreate(
      creneaux.map((creneau) => ({ ...creneau, assignationId: assignation.id })),
      { transaction },
    );
    await planning.generateUpcoming(assignation, { transaction });
    await demande.update({ statut: 'ASSIGNEE', traiteePar: req.user.id }, { transaction });

    assignation.demande = demande;
    await notifierParties(assignation, {
      type: 'NOUVELLE_ASSIGNATION',
      titre: 'Nouvelle assignation',
      message: `Un professeur a ete assigne a la demande #${demande.id}, debut le ${assignation.dateDebut}`,
    }, { transaction });
    return assignation.id;
  });

  res.status(201).json(await findAssignation(id));
}

async function list(req, res) {
  const {
    statut, professeurId, demandeId, page, limit,
  } = req.query;
  const result = await Assignation.findAndCountAll({
    where: {
      ...(statut && { statut }),
      ...(professeurId && { professeurId }),
      ...(demandeId && { demandeId }),
    },
    include: [q.demandeComplete(), q.professeurAvecUser()],
    order: [['createdAt', 'DESC']],
    distinct: true,
    ...q.paginate({ page, limit }),
  });
  res.json(q.pageResponse(result, { page, limit }));
}

async function get(req, res) {
  const assignation = await findAssignation(req.params.id);
  if (!assignation) throw AppError.notFound('Assignation introuvable');
  const paiements = await Paiement.findAll({
    where: { assignationId: assignation.id },
    order: [['annee', 'DESC'], ['mois', 'DESC'], ['createdAt', 'DESC']],
  });
  res.json({ ...assignation.toJSON(), paiements });
}

// Tarifs / date de fin. Les tarifs s'appliquent au calcul des mois non encore regles.
async function update(req, res) {
  const assignation = await findOr404(req.params.id);
  if (assignation.statut === 'TERMINEE') throw AppError.conflict('Assignation terminee : modification impossible');

  const values = q.defined(req.body);
  if (values.dateFin && values.dateFin < assignation.dateDebut) {
    throw AppError.badRequest('La date de fin doit etre apres la date de debut');
  }

  await sequelize.transaction(async (transaction) => {
    await assignation.update(values, { transaction });
    if ('dateFin' in values) {
      if (values.dateFin) {
        await Seance.destroy({
          where: { assignationId: assignation.id, statut: 'PREVUE', codeSecret: null, dateSeance: { [Op.gt]: values.dateFin } },
          transaction,
        });
      }
      if (assignation.statut === 'ACTIVE') await planning.generateUpcoming(assignation, { transaction });
    }
  });

  res.json(await findAssignation(assignation.id));
}

async function changeStatut(req, res) {
  const { statut, relancerDemande } = req.body;
  const assignation = await findOr404(req.params.id);
  if (assignation.statut === statut) return res.json(await findAssignation(assignation.id));
  if (assignation.statut === 'TERMINEE') throw AppError.conflict('Une assignation terminee ne peut pas etre reactivee');

  await sequelize.transaction(async (transaction) => {
    const seancesFutures = { assignationId: assignation.id, dateSeance: { [Op.gte]: today() } };

    if (statut === 'ACTIVE') {
      const autre = await Assignation.findOne({
        where: { demandeId: assignation.demandeId, statut: 'ACTIVE', id: { [Op.ne]: assignation.id } },
        transaction,
      });
      if (autre) throw AppError.conflict(`La demande a deja une autre assignation active (#${autre.id})`);

      const creneaux = await CreneauHebdo.findAll({ where: { assignationId: assignation.id }, transaction });
      await planning.assertNoProfConflict({
        professeurId: assignation.professeurId,
        dateDebut: assignation.dateDebut,
        dateFin: assignation.dateFin,
        creneaux,
        excludeAssignationId: assignation.id,
      }, { transaction });

      await assignation.update({ statut }, { transaction });
      await Seance.update(
        { statut: 'PREVUE', motifAnnulation: null },
        { where: { ...seancesFutures, statut: 'ANNULEE', motifAnnulation: MOTIF_SUSPENSION }, transaction },
      );
      assignation.creneaux = creneaux;
      await planning.generateUpcoming(assignation, { transaction });
    } else {
      const fin = statut === 'TERMINEE';
      const dateFin = [assignation.dateDebut, today()].sort().pop();
      await assignation.update({
        statut,
        ...(fin && (!assignation.dateFin || assignation.dateFin > dateFin) && { dateFin }),
      }, { transaction });
      await Seance.update(
        { statut: 'ANNULEE', motifAnnulation: fin ? MOTIF_FIN : MOTIF_SUSPENSION },
        { where: { ...seancesFutures, statut: 'PREVUE' }, transaction },
      );
      if (fin && relancerDemande) {
        await assignation.demande.update({ statut: 'EN_RECHERCHE' }, { transaction });
      }
    }

    const libelles = { ACTIVE: 'reactivee', SUSPENDUE: 'suspendue', TERMINEE: 'terminee' };
    await notifierParties(assignation, {
      type: 'ASSIGNATION_STATUT',
      titre: `Assignation ${libelles[statut]}`,
      message: `L'assignation #${assignation.id} a ete ${libelles[statut]}`,
    }, { transaction });
  });

  res.json(await findAssignation(assignation.id));
}

async function replaceCreneaux(req, res) {
  const assignation = await findOr404(req.params.id);
  if (assignation.statut === 'TERMINEE') throw AppError.conflict('Assignation terminee : modification impossible');
  const { creneaux } = req.body;
  planning.assertNoInternalOverlap(creneaux);

  await sequelize.transaction(async (transaction) => {
    if (assignation.statut === 'ACTIVE') {
      await planning.assertNoProfConflict({
        professeurId: assignation.professeurId,
        dateDebut: assignation.dateDebut,
        dateFin: assignation.dateFin,
        creneaux,
        excludeAssignationId: assignation.id,
      }, { transaction });
    }
    await planning.replaceCreneaux(assignation, creneaux, { transaction });
    await notifierParties(assignation, {
      type: 'PLANNING_MODIFIE',
      titre: 'Planning modifie',
      message: `Le planning de l'assignation #${assignation.id} a ete modifie`,
    }, { transaction });
  });

  res.json(await findAssignation(assignation.id));
}

// Planifier un mois plus lointain a l'avance (le mois courant et le suivant sont automatiques)
async function genererSeances(req, res) {
  const assignation = await findOr404(req.params.id);
  if (assignation.statut !== 'ACTIVE') throw AppError.conflict("L'assignation n'est pas active");
  const total = await planning.generateSeances(assignation, req.body, { from: today() });
  res.json({ seancesPlanifiees: total });
}

async function recap(req, res) {
  const assignation = await findOr404(req.params.id);
  res.json(await recapMensuel(assignation, req.query));
}

module.exports = {
  create, list, get, update, changeStatut, replaceCreneaux, genererSeances, recap,
};
