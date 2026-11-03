const { Op } = require('sequelize');
const { User, Client, Demande } = require('../models');
const q = require('../utils/query');
const AppError = require('../utils/AppError');

async function listClients(req, res) {
  const { q: recherche, page, limit } = req.query;
  const like = recherche && { [Op.like]: `%${recherche}%` };
  const result = await User.findAndCountAll({
    where: {
      role: 'CLIENT',
      ...(like && { [Op.or]: [{ nom: like }, { prenom: like }, { email: like }, { telephone: like }] }),
    },
    attributes: [...q.USER_PUBLIC, 'createdAt'],
    include: [{ model: Client, as: 'client' }],
    order: [['createdAt', 'DESC']],
    ...q.paginate({ page, limit }),
  });
  res.json(q.pageResponse(result, { page, limit }));
}

async function getClient(req, res) {
  const user = await User.findOne({
    where: { id: req.params.id, role: 'CLIENT' },
    attributes: [...q.USER_PUBLIC, 'createdAt'],
    include: [{
      model: Client,
      as: 'client',
      include: [{ model: Demande, as: 'demandes', include: q.detailsDemande() }],
    }],
    order: [[{ model: Client, as: 'client' }, { model: Demande, as: 'demandes' }, 'createdAt', 'DESC']],
  });
  if (!user) throw AppError.notFound('Client introuvable');
  res.json(user);
}

// Suspendre bloque la connexion immediatement (verifie a chaque requete)
async function changeStatut(req, res) {
  const user = await User.findByPk(req.params.id);
  if (!user) throw AppError.notFound('Utilisateur introuvable');
  if (user.id === req.user.id) throw AppError.badRequest('Vous ne pouvez pas modifier votre propre statut');
  if (user.role === 'ADMIN') throw AppError.forbidden("Le statut d'un administrateur ne se modifie pas ici");

  await user.update({ statut: req.body.statut });
  res.json(user);
}

module.exports = { listClients, getClient, changeStatut };
