const { Notification } = require('../models');
const q = require('../utils/query');
const AppError = require('../utils/AppError');

async function list(req, res) {
  const { nonLues, page, limit } = req.query;
  const where = { userId: req.user.id, ...(nonLues && { luLe: null }) };
  const [result, totalNonLues] = await Promise.all([
    Notification.findAndCountAll({ where, order: [['createdAt', 'DESC'], ['id', 'DESC']], ...q.paginate({ page, limit }) }),
    Notification.count({ where: { userId: req.user.id, luLe: null } }),
  ]);
  res.json({ ...q.pageResponse(result, { page, limit }), nonLues: totalNonLues });
}

async function marquerLue(req, res) {
  const notification = await Notification.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!notification) throw AppError.notFound('Notification introuvable');
  if (!notification.luLe) await notification.update({ luLe: new Date() });
  res.json(notification);
}

async function toutMarquerLu(req, res) {
  const [count] = await Notification.update({ luLe: new Date() }, { where: { userId: req.user.id, luLe: null } });
  res.json({ marquees: count });
}

module.exports = { list, marquerLue, toutMarquerLu };
