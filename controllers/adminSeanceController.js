const { Op } = require('sequelize');
const { Seance, Assignation } = require('../models');
const q = require('../utils/query');
const { monthBounds } = require('../utils/dates');
const AppError = require('../utils/AppError');

async function list(req, res) {
  const { annee, mois, assignationId } = req.query;
  const { debut, fin } = monthBounds({ annee, mois });
  res.json(await Seance.findAll({
    where: { dateSeance: { [Op.between]: [debut, fin] }, ...(assignationId && { assignationId }) },
    include: [{
      model: Assignation,
      as: 'assignation',
      attributes: ['id', 'statut', 'demandeId', 'professeurId'],
      include: [q.professeurAvecUser()],
    }],
    order: [['dateSeance', 'ASC'], ['heureDebut', 'ASC']],
  }));
}

// Correction manuelle d'une seance (litige, rattrapage, deblocage apres trop d'essais...)
async function update(req, res) {
  const seance = await Seance.findByPk(req.params.id);
  if (!seance) throw AppError.notFound('Seance introuvable');

  const { statut, motifAnnulation, debloquer } = req.body;
  const values = {};
  if (debloquer) values.tentativesEchouees = 0;
  if (statut) {
    values.statut = statut;
    values.dateValidation = statut === 'EFFECTUEE' ? seance.dateValidation || new Date() : null;
    values.motifAnnulation = statut === 'ANNULEE' ? motifAnnulation : null;
  }

  await seance.update(values);
  res.json(seance);
}

module.exports = { list, update };
