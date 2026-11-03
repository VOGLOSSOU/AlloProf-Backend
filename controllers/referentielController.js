const { Ville, Specialite, Niveau } = require('../models');
const AppError = require('../utils/AppError');

// Formulaire de demande : uniquement les valeurs actives
async function listActifs(req, res) {
  const [villes, specialites, niveaux] = await Promise.all([
    Ville.findAll({ where: { estActive: true }, order: [['nom', 'ASC']] }),
    Specialite.findAll({ where: { estActive: true }, order: [['libelle', 'ASC']] }),
    Niveau.findAll({ where: { estActive: true }, order: [['ordre', 'ASC']] }),
  ]);
  res.json({ villes, specialites, niveaux });
}

// CRUD admin, identique pour les trois referentiels.
// Pas de suppression : on desactive (estActive = false) pour garder l'historique.
function crudFor(Model, order) {
  return {
    async list(req, res) {
      res.json(await Model.findAll({ order }));
    },

    async create(req, res) {
      res.status(201).json(await Model.create(req.body));
    },

    async update(req, res) {
      const item = await Model.findByPk(req.params.id);
      if (!item) throw AppError.notFound();
      res.json(await item.update(req.body));
    },
  };
}

module.exports = {
  listActifs,
  villes: crudFor(Ville, [['nom', 'ASC']]),
  specialites: crudFor(Specialite, [['libelle', 'ASC']]),
  niveaux: crudFor(Niveau, [['ordre', 'ASC']]),
};
