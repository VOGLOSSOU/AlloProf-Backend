const { z } = require('zod');

const libelle = z.string().trim().min(1, 'Champ obligatoire').max(120);

// Les trois referentiels n'ont pas le meme nom de champ ni les memes colonnes
module.exports = {
  ville: {
    create: z.object({ nom: libelle }),
    update: z.object({ nom: libelle.optional(), estActive: z.boolean().optional() }),
  },
  specialite: {
    create: z.object({ libelle }),
    update: z.object({ libelle: libelle.optional(), estActive: z.boolean().optional() }),
  },
  niveau: {
    create: z.object({ libelle: libelle.max(100), ordre: z.coerce.number().int().min(0).max(65535) }),
    update: z.object({
      libelle: libelle.max(100).optional(),
      ordre: z.coerce.number().int().min(0).max(65535).optional(),
      estActive: z.boolean().optional(),
    }),
  },
};
