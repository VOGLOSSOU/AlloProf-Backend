const { Op } = require('sequelize');
const { Assignation, Seance, Paiement } = require('../models');
const { validerPresence } = require('../services/seanceService');
const q = require('../utils/query');
const { monthBounds } = require('../utils/dates');

// Le prof voit son propre tarif, jamais celui facture au client
const ATTRIBUTS_ASSIGNATION = ['id', 'demandeId', 'statut', 'dateDebut', 'dateFin', 'uniteTarif', 'tarifProf'];

// Ni le budget du client ni la note interne de l'admin
const demandePourProf = () => ({
  ...q.demandeComplete(),
  attributes: { exclude: ['budget', 'noteAdmin', 'traiteePar'] },
});

async function assignations(req, res) {
  const { statut } = req.query;
  res.json(await Assignation.findAll({
    where: { professeurId: req.user.id, ...(statut ? { statut } : { statut: { [Op.ne]: 'TERMINEE' } }) },
    attributes: ATTRIBUTS_ASSIGNATION,
    include: [demandePourProf(), q.creneaux()],
    order: [['dateDebut', 'DESC'], ...q.ORDRE_CRENEAUX],
  }));
}

async function calendrier(req, res) {
  const { annee, mois, assignationId } = req.query;
  const { debut, fin } = monthBounds({ annee, mois });
  res.json(await Seance.findAll({
    where: { dateSeance: { [Op.between]: [debut, fin] }, ...(assignationId && { assignationId }) },
    include: [{
      model: Assignation,
      as: 'assignation',
      attributes: ['id', 'statut', 'demandeId'],
      where: { professeurId: req.user.id },
      include: [demandePourProf()],
    }],
    order: [['dateSeance', 'ASC'], ['heureDebut', 'ASC']],
  }));
}

async function valider(req, res) {
  res.json(await validerPresence(Number(req.params.id), req.user.id, req.body.code));
}

async function paiements(req, res) {
  const { page, limit } = req.query;
  const result = await Paiement.findAndCountAll({
    where: { sens: 'ADMIN_VERS_PROF' },
    include: [{
      model: Assignation,
      as: 'assignation',
      attributes: ['id', 'demandeId'],
      where: { professeurId: req.user.id },
    }],
    order: [['annee', 'DESC'], ['mois', 'DESC'], ['createdAt', 'DESC']],
    ...q.paginate({ page, limit }),
  });
  res.json(q.pageResponse(result, { page, limit }));
}

module.exports = { assignations, calendrier, valider, paiements };
