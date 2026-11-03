const { z } = require('zod');
const { email, telephone, nom, ids, id, pagination } = require('./common');

const create = z.object({
  nom,
  prenom: nom,
  email,
  telephone,
  bio: z.string().trim().max(5000).optional(),
  specialiteIds: ids,
  villeIds: ids,
  niveauIds: ids,
});

const update = z.object({
  nom: nom.optional(),
  prenom: nom.optional(),
  email: email.optional(),
  telephone: telephone.optional(),
  bio: z.string().trim().max(5000).optional().nullable(),
  disponibilite: z.enum(['DISPONIBLE', 'INDISPONIBLE']).optional(),
  specialiteIds: ids.optional(),
  villeIds: ids.optional(),
  niveauIds: ids.optional(),
});

const list = z.object({
  q: z.string().trim().max(100).optional(),
  disponibilite: z.enum(['DISPONIBLE', 'INDISPONIBLE']).optional(),
  villeId: id.optional(),
  specialiteId: id.optional(),
  niveauId: id.optional(),
  ...pagination,
});

module.exports = { create, update, list };
