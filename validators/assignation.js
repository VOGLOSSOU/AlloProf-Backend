const { z } = require('zod');
const { id, dateStr, heure, montant, periode, pagination } = require('./common');

const creneau = z
  .object({
    jourSemaine: z.coerce.number().int().min(1, '1 = lundi').max(7, '7 = dimanche'),
    heureDebut: heure,
    heureFin: heure,
  })
  .refine((c) => c.heureFin > c.heureDebut, { message: "L'heure de fin doit etre apres l'heure de debut", path: ['heureFin'] });

const creneaux = z.array(creneau).min(1, 'Au moins un creneau est requis').max(21);

const create = z
  .object({
    demandeId: id,
    professeurId: id,
    dateDebut: dateStr,
    dateFin: dateStr.optional().nullable(),
    uniteTarif: z.enum(['SEANCE', 'HEURE', 'MOIS']),
    tarifClient: montant,
    tarifProf: montant,
    creneaux,
  })
  .refine((a) => !a.dateFin || a.dateFin >= a.dateDebut, { message: 'La date de fin doit etre apres la date de debut', path: ['dateFin'] });

const update = z.object({
  dateFin: dateStr.optional().nullable(),
  uniteTarif: z.enum(['SEANCE', 'HEURE', 'MOIS']).optional(),
  tarifClient: montant.optional(),
  tarifProf: montant.optional(),
});

const changeStatut = z.object({
  statut: z.enum(['ACTIVE', 'SUSPENDUE', 'TERMINEE']),
  // A la fin d'une assignation, remettre la demande en recherche (changement de prof)
  relancerDemande: z.boolean().optional(),
});

const replaceCreneaux = z.object({ creneaux });

const list = z.object({
  statut: z.enum(['ACTIVE', 'SUSPENDUE', 'TERMINEE']).optional(),
  professeurId: id.optional(),
  demandeId: id.optional(),
  ...pagination,
});

const genererSeances = z.object(periode);

module.exports = { create, update, changeStatut, replaceCreneaux, list, genererSeances };
