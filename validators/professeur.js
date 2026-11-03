const { z } = require('zod');
const { email, telephone, nom, ids } = require('./common');

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

module.exports = { create };
