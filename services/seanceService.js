const crypto = require('crypto');
const { Op } = require('sequelize');
const { sequelize, Seance, Assignation, Demande, CreneauHebdo } = require('../models');
const { notify, notifyAdmins } = require('./notificationService');
const { generateUpcoming } = require('./planningService');
const { today } = require('../utils/dates');
const AppError = require('../utils/AppError');

const MAX_TENTATIVES = 5;

// Le code n'est genere qu'au premier affichage le jour J (regle 6).
// L'UPDATE conditionnel evite que deux affichages simultanes creent deux codes.
async function ensureCode(seance) {
  if (seance.codeSecret) return seance;
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await Seance.update(
    { codeSecret: code, codeGenereLe: new Date() },
    { where: { id: seance.id, codeSecret: null } },
  );
  return seance.reload();
}

function codesEgaux(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

async function validerPresence(seanceId, professeurId, code) {
  const result = await sequelize.transaction(async (transaction) => {
    const seance = await Seance.findByPk(seanceId, { transaction, lock: transaction.LOCK.UPDATE });
    const assignation = seance && await Assignation.findByPk(seance.assignationId, {
      include: [{ model: Demande, as: 'demande', attributes: ['clientId'] }],
      transaction,
    });

    if (!seance || assignation.professeurId !== professeurId) throw AppError.notFound('Seance introuvable');
    if (seance.statut !== 'PREVUE') throw AppError.conflict(`Cette seance est deja ${seance.statut.toLowerCase()}`);
    if (assignation.statut !== 'ACTIVE') throw AppError.conflict("L'assignation n'est pas active");
    if (seance.dateSeance !== today()) {
      throw AppError.badRequest("La validation n'est possible que le jour de la seance");
    }
    if (seance.tentativesEchouees >= MAX_TENTATIVES) {
      throw AppError.forbidden("Trop d'essais : validation bloquee, contactez l'administrateur");
    }
    if (!seance.codeSecret) {
      throw AppError.badRequest("Le client n'a pas encore affiche le code du jour");
    }

    if (!codesEgaux(code, seance.codeSecret)) {
      // L'echec est enregistre (on ne leve pas d'erreur ici sinon la transaction serait annulee)
      await seance.increment('tentativesEchouees', { transaction });
      const restantes = MAX_TENTATIVES - (seance.tentativesEchouees + 1);
      if (restantes === 0) {
        await notifyAdmins({
          type: 'SEANCE_BLOQUEE',
          titre: 'Validation de seance bloquee',
          message: `Trop de codes errones pour la seance #${seance.id} du ${seance.dateSeance}`,
          data: { seanceId: seance.id, assignationId: assignation.id },
        }, { transaction });
      }
      return { ok: false, restantes };
    }

    await seance.update({ statut: 'EFFECTUEE', dateValidation: new Date() }, { transaction });
    await notify(assignation.demande.clientId, {
      type: 'SEANCE_VALIDEE',
      titre: 'Seance validee',
      message: `La seance du ${seance.dateSeance} a ete validee par le professeur`,
      data: { seanceId: seance.id, assignationId: assignation.id },
    }, { transaction });
    return { ok: true, seance };
  });

  if (!result.ok) {
    throw result.restantes > 0
      ? AppError.badRequest(`Code incorrect, encore ${result.restantes} essai(s)`)
      : AppError.forbidden("Code incorrect : validation bloquee, l'administrateur a ete prevenu");
  }
  return result.seance;
}

// Taches quotidiennes (jobs/scheduler.js)
async function marquerSeancesManquees() {
  const [count] = await Seance.update(
    { statut: 'MANQUEE' },
    { where: { statut: 'PREVUE', dateSeance: { [Op.lt]: today() } } },
  );
  return count;
}

async function genererSeancesAVenir() {
  const assignations = await Assignation.findAll({
    where: { statut: 'ACTIVE' },
    include: [{ model: CreneauHebdo, as: 'creneaux' }],
  });
  for (const assignation of assignations) {
    await generateUpcoming(assignation);
  }
  return assignations.length;
}

module.exports = { MAX_TENTATIVES, ensureCode, validerPresence, marquerSeancesManquees, genererSeancesAVenir };
