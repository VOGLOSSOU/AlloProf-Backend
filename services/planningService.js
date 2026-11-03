const { Op } = require('sequelize');
const { Assignation, CreneauHebdo, Seance } = require('../models');
const { today, monthOf, addMonths, monthBounds, daysOfMonth, timeToMinutes } = require('../utils/dates');
const AppError = require('../utils/AppError');

const JOURS = ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const FIN_INDEFINIE = '9999-12-31';

function overlaps(a, b) {
  return a.jourSemaine === b.jourSemaine
    && timeToMinutes(a.heureDebut) < timeToMinutes(b.heureFin)
    && timeToMinutes(b.heureDebut) < timeToMinutes(a.heureFin);
}

function describe(creneau) {
  return `${JOURS[creneau.jourSemaine]} ${creneau.heureDebut.slice(0, 5)}-${creneau.heureFin.slice(0, 5)}`;
}

// Les creneaux d'un meme planning ne doivent pas se chevaucher
function assertNoInternalOverlap(creneaux) {
  for (let i = 0; i < creneaux.length; i += 1) {
    for (let j = i + 1; j < creneaux.length; j += 1) {
      if (overlaps(creneaux[i], creneaux[j])) {
        throw AppError.badRequest(`Creneaux qui se chevauchent : ${describe(creneaux[i])} et ${describe(creneaux[j])}`);
      }
    }
  }
}

// Le prof ne peut pas avoir deux cours en meme temps sur des assignations actives
// dont les periodes se recouvrent
async function assertNoProfConflict({ professeurId, dateDebut, dateFin, creneaux, excludeAssignationId }, { transaction } = {}) {
  const others = await Assignation.findAll({
    where: {
      professeurId,
      statut: 'ACTIVE',
      ...(excludeAssignationId && { id: { [Op.ne]: excludeAssignationId } }),
      dateDebut: { [Op.lte]: dateFin || FIN_INDEFINIE },
      [Op.or]: [{ dateFin: null }, { dateFin: { [Op.gte]: dateDebut } }],
    },
    include: [{ model: CreneauHebdo, as: 'creneaux' }],
    transaction,
  });

  for (const other of others) {
    for (const existing of other.creneaux) {
      const conflict = creneaux.find((creneau) => overlaps(creneau, existing));
      if (conflict) {
        throw AppError.conflict(
          `Le professeur a deja cours le ${describe(existing)} (assignation #${other.id})`,
          { assignationId: other.id, creneau: describe(conflict) },
        );
      }
    }
  }
}

// Cree les seances d'un mois a partir des creneaux (idempotent : les seances
// existantes sont ignorees grace a l'index unique uq_seance)
async function generateSeances(assignation, periode, { from, transaction } = {}) {
  const creneaux = assignation.creneaux
    || await CreneauHebdo.findAll({ where: { assignationId: assignation.id }, transaction });
  const debut = [assignation.dateDebut, from].filter(Boolean).sort().pop();
  const fin = assignation.dateFin || FIN_INDEFINIE;

  const rows = [];
  for (const day of daysOfMonth(periode)) {
    if (day.date < debut || day.date > fin) continue;
    for (const creneau of creneaux) {
      if (creneau.jourSemaine === day.jourSemaine) {
        rows.push({
          assignationId: assignation.id,
          dateSeance: day.date,
          heureDebut: creneau.heureDebut,
          heureFin: creneau.heureFin,
        });
      }
    }
  }

  if (rows.length) await Seance.bulkCreate(rows, { ignoreDuplicates: true, transaction });
  return rows.length;
}

// Mois courant + mois suivant : le prof et le client voient toujours la suite du calendrier
async function generateUpcoming(assignation, { transaction } = {}) {
  const current = monthOf(today());
  await generateSeances(assignation, current, { from: today(), transaction });
  await generateSeances(assignation, addMonths(current, 1), { transaction });
}

// Remplace le planning type : les seances futures non commencees sont recreees
async function replaceCreneaux(assignation, creneaux, { transaction } = {}) {
  await CreneauHebdo.destroy({ where: { assignationId: assignation.id }, transaction });
  const created = await CreneauHebdo.bulkCreate(
    creneaux.map((creneau) => ({ ...creneau, assignationId: assignation.id })),
    { transaction },
  );

  await Seance.destroy({
    where: { assignationId: assignation.id, statut: 'PREVUE', codeSecret: null, dateSeance: { [Op.gt]: today() } },
    transaction,
  });

  assignation.creneaux = created;
  await generateUpcoming(assignation, { transaction });
  return created;
}

module.exports = {
  overlaps,
  assertNoInternalOverlap,
  assertNoProfConflict,
  generateSeances,
  generateUpcoming,
  replaceCreneaux,
  monthBounds,
};
