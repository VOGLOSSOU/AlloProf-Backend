const { Op } = require('sequelize');
const { Seance, Paiement } = require('../models');
const { today, monthBounds, timeToMinutes } = require('../utils/dates');

// Calculs en centimes pour eviter les erreurs d'arrondi des flottants
const toCents = (value) => Math.round(Number(value) * 100);
const fromCents = (cents) => cents / 100;

// Montant du pour un mois selon l'unite du tarif (regle 5 de la modelisation)
function montantDu(uniteTarif, tarif, { seancesEffectuees, minutesEffectuees }) {
  const tarifCents = toCents(tarif);
  switch (uniteTarif) {
    case 'SEANCE': return seancesEffectuees * tarifCents;
    case 'HEURE': return Math.round((minutesEffectuees * tarifCents) / 60);
    case 'MOIS': return tarifCents;
    default: throw new Error(`Unite de tarif inconnue : ${uniteTarif}`);
  }
}

function sommeParStatut(paiements, sens) {
  return paiements
    .filter((p) => p.sens === sens)
    .reduce((acc, p) => {
      acc[p.statut === 'PAYE' ? 'paye' : 'enAttente'] += toCents(p.montant);
      return acc;
    }, { paye: 0, enAttente: 0 });
}

function buildRecap(assignation, periode, seances, paiements) {
  const compteur = { PREVUE: 0, EFFECTUEE: 0, MANQUEE: 0, ANNULEE: 0 };
  let minutesEffectuees = 0;
  for (const seance of seances) {
    compteur[seance.statut] += 1;
    if (seance.statut === 'EFFECTUEE') {
      minutesEffectuees += timeToMinutes(seance.heureFin) - timeToMinutes(seance.heureDebut);
    }
  }

  const realise = { seancesEffectuees: compteur.EFFECTUEE, minutesEffectuees };
  const duClient = montantDu(assignation.uniteTarif, assignation.tarifClient, realise);
  const duProf = montantDu(assignation.uniteTarif, assignation.tarifProf, realise);
  const client = sommeParStatut(paiements, 'CLIENT_VERS_ADMIN');
  const prof = sommeParStatut(paiements, 'ADMIN_VERS_PROF');
  const { fin } = monthBounds(periode);

  return {
    periode,
    uniteTarif: assignation.uniteTarif,
    seances: {
      prevues: compteur.PREVUE,
      effectuees: compteur.EFFECTUEE,
      manquees: compteur.MANQUEE,
      annulees: compteur.ANNULEE,
      heuresEffectuees: Math.round((minutesEffectuees / 60) * 100) / 100,
    },
    // Mois termine et plus aucune seance en attente : le prof peut etre paye
    moisComplet: fin < today() && compteur.PREVUE === 0,
    client: {
      du: fromCents(duClient),
      paye: fromCents(client.paye),
      enAttente: fromCents(client.enAttente),
      reste: fromCents(duClient - client.paye),
    },
    prof: {
      du: fromCents(duProf),
      paye: fromCents(prof.paye),
      enAttente: fromCents(prof.enAttente),
      reste: fromCents(duProf - prof.paye),
    },
    marge: fromCents(duClient - duProf),
  };
}

async function recapMensuel(assignation, periode) {
  const { debut, fin } = monthBounds(periode);
  const [seances, paiements] = await Promise.all([
    Seance.findAll({
      where: { assignationId: assignation.id, dateSeance: { [Op.between]: [debut, fin] } },
      attributes: ['statut', 'heureDebut', 'heureFin'],
    }),
    Paiement.findAll({
      where: { assignationId: assignation.id, annee: periode.annee, mois: periode.mois },
      attributes: ['sens', 'statut', 'montant'],
    }),
  ]);
  return buildRecap(assignation, periode, seances, paiements);
}

module.exports = { montantDu, buildRecap, recapMensuel };
