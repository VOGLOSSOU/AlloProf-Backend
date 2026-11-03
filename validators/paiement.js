const { z } = require('zod');
const { id, montant, periode, texteOptionnel, pagination } = require('./common');

const SENS = ['CLIENT_VERS_ADMIN', 'ADMIN_VERS_PROF'];
const MODES = ['MOBILE_MONEY', 'ESPECES', 'VIREMENT'];

const create = z.object({
  assignationId: id,
  sens: z.enum(SENS),
  ...periode,
  montant: montant.refine((m) => m > 0, 'Le montant doit etre superieur a 0'),
  mode: z.enum(MODES).optional().nullable(),
  reference: texteOptionnel(100),
  statut: z.enum(['EN_ATTENTE', 'PAYE']).default('PAYE'),
  commentaire: texteOptionnel(255),
  datePaiement: z.coerce.date().optional().nullable(),
});

const update = z.object({
  montant: montant.refine((m) => m > 0, 'Le montant doit etre superieur a 0').optional(),
  mode: z.enum(MODES).optional().nullable(),
  reference: texteOptionnel(100),
  statut: z.enum(['EN_ATTENTE', 'PAYE']).optional(),
  commentaire: texteOptionnel(255),
  datePaiement: z.coerce.date().optional().nullable(),
});

const list = z.object({
  assignationId: id.optional(),
  sens: z.enum(SENS).optional(),
  statut: z.enum(['EN_ATTENTE', 'PAYE']).optional(),
  annee: periode.annee.optional(),
  mois: periode.mois.optional(),
  ...pagination,
});

const recap = z.object(periode);

module.exports = { create, update, list, recap };
