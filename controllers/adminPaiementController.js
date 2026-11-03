const { sequelize, Paiement, Assignation, Demande } = require('../models');
const { notify } = require('../services/notificationService');
const q = require('../utils/query');
const AppError = require('../utils/AppError');

const LIBELLE_MOIS = (p) => `${String(p.mois).padStart(2, '0')}/${p.annee}`;

// Un paiement PAYE a toujours une date (contrainte chk_paiements_paye)
function avecDatePaiement(values, existing) {
  const statut = values.statut ?? existing?.statut;
  if (statut === 'PAYE' && !values.datePaiement && !existing?.datePaiement) {
    return { ...values, datePaiement: new Date() };
  }
  if (statut === 'EN_ATTENTE' && values.statut) return { ...values, datePaiement: null };
  return values;
}

// Le destinataire est prevenu quand un paiement passe a PAYE
async function notifierSiPaye(paiement, avant, { transaction }) {
  if (paiement.statut !== 'PAYE' || avant === 'PAYE') return;
  const assignation = await Assignation.findByPk(paiement.assignationId, {
    include: [{ model: Demande, as: 'demande', attributes: ['clientId'] }],
    transaction,
  });
  const versProf = paiement.sens === 'ADMIN_VERS_PROF';
  await notify(versProf ? assignation.professeurId : assignation.demande.clientId, {
    type: versProf ? 'PAIEMENT_RECU' : 'PAIEMENT_ENREGISTRE',
    titre: versProf ? 'Paiement recu' : 'Paiement enregistre',
    message: `${paiement.montant} FCFA pour ${LIBELLE_MOIS(paiement)}`,
    data: { paiementId: paiement.id, assignationId: paiement.assignationId },
  }, { transaction });
}

async function list(req, res) {
  const {
    assignationId, sens, statut, annee, mois, page, limit,
  } = req.query;
  const result = await Paiement.findAndCountAll({
    where: q.defined({ assignationId, sens, statut, annee, mois }),
    include: [{
      model: Assignation,
      as: 'assignation',
      attributes: ['id', 'demandeId', 'professeurId', 'uniteTarif', 'tarifClient', 'tarifProf'],
      include: [q.professeurAvecUser(), { model: Demande, as: 'demande', attributes: ['id'], include: [q.clientAvecUser()] }],
    }],
    order: [['annee', 'DESC'], ['mois', 'DESC'], ['createdAt', 'DESC']],
    ...q.paginate({ page, limit }),
  });
  res.json(q.pageResponse(result, { page, limit }));
}

async function create(req, res) {
  const assignation = await Assignation.findByPk(req.body.assignationId);
  if (!assignation) throw AppError.notFound('Assignation introuvable');

  const paiement = await sequelize.transaction(async (transaction) => {
    const created = await Paiement.create(avecDatePaiement(req.body), { transaction });
    await notifierSiPaye(created, null, { transaction });
    return created;
  });
  res.status(201).json(paiement);
}

async function update(req, res) {
  const paiement = await Paiement.findByPk(req.params.id);
  if (!paiement) throw AppError.notFound('Paiement introuvable');
  const avant = paiement.statut;

  await sequelize.transaction(async (transaction) => {
    await paiement.update(avecDatePaiement(q.defined(req.body), paiement), { transaction });
    await notifierSiPaye(paiement, avant, { transaction });
  });
  res.json(paiement);
}

async function remove(req, res) {
  const paiement = await Paiement.findByPk(req.params.id);
  if (!paiement) throw AppError.notFound('Paiement introuvable');
  await paiement.destroy();
  res.status(204).end();
}

module.exports = { list, create, update, remove };
