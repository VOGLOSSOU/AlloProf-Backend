const { Op } = require('sequelize');
const AppError = require('../utils/AppError');

// Verifie que tous les ids existent et sont actifs dans le referentiel
async function assertActiveIds(Model, ids, champ, { transaction } = {}) {
  const list = [].concat(ids);
  const found = await Model.findAll({
    where: { id: { [Op.in]: list }, estActive: true },
    attributes: ['id'],
    transaction,
  });
  const foundIds = new Set(found.map((row) => row.id));
  const missing = list.filter((id) => !foundIds.has(id));
  if (missing.length) {
    throw AppError.badRequest('Donnees invalides', [{ champ, message: `Inexistants ou desactives : ${missing.join(', ')}` }]);
  }
}

module.exports = { assertActiveIds };
