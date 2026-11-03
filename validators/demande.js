const { z } = require('zod');
const { id, ids, montant, texteOptionnel, pagination } = require('./common');

const JOURS = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'];
const STATUTS = ['EN_ATTENTE', 'EN_RECHERCHE', 'ASSIGNEE', 'ANNULEE', 'REJETEE'];

const create = z.object({
  villeId: id,
  quartier: texteOptionnel(120),
  niveauId: id,
  typeBeneficiaire: z.enum(['ENFANT', 'SOI_MEME']),
  description: z.string().trim().min(10, 'Decrivez votre besoin (10 caracteres minimum)').max(5000),
  budget: montant.optional().nullable(),
  joursSouhaites: z.array(z.enum(JOURS)).max(7).transform((jours) => [...new Set(jours)]).optional().nullable(),
  caracteristiquesProf: texteOptionnel(2000),
  specialiteIds: ids,
});

const list = z.object({
  statut: z.enum(STATUTS).optional(),
  villeId: id.optional(),
  ...pagination,
});

// L'admin fait avancer la demande ; ASSIGNEE est pose par la creation d'une assignation
const adminUpdate = z.object({
  statut: z.enum(['EN_ATTENTE', 'EN_RECHERCHE', 'REJETEE']).optional(),
  noteAdmin: texteOptionnel(5000),
});

module.exports = { create, list, adminUpdate };
