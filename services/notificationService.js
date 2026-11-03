const { User, Notification } = require('../models');

async function notify(userIds, { type, titre, message, data }, { transaction } = {}) {
  const ids = [...new Set([].concat(userIds).filter(Boolean))];
  if (!ids.length) return;
  await Notification.bulkCreate(
    ids.map((userId) => ({ userId, type, titre, message, data })),
    { transaction },
  );
}

async function notifyAdmins(notification, { transaction } = {}) {
  const admins = await User.findAll({ where: { role: 'ADMIN', statut: 'ACTIF' }, attributes: ['id'], transaction });
  await notify(admins.map((admin) => admin.id), notification, { transaction });
}

module.exports = { notify, notifyAdmins };
