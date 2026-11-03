const { z } = require('zod');
const { id, periode, texteOptionnel } = require('./common');

const calendrier = z.object({ ...periode, assignationId: id.optional() });

const valider = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'Le code contient 6 chiffres'),
});

// Corrections manuelles par l'admin (litige, cours rattrape, annulation...)
const adminUpdate = z
  .object({
    statut: z.enum(['PREVUE', 'EFFECTUEE', 'MANQUEE', 'ANNULEE']).optional(),
    motifAnnulation: texteOptionnel(2000),
    debloquer: z.boolean().optional(),
  })
  .refine((s) => s.statut !== 'ANNULEE' || s.motifAnnulation, {
    message: "Le motif est obligatoire pour annuler une seance",
    path: ['motifAnnulation'],
  });

module.exports = { calendrier, valider, adminUpdate };
