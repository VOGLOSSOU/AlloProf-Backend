const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database')[process.env.NODE_ENV || 'development'];

const sequelize = new Sequelize(config.database, config.username, config.password, config);

const models = {
  User: require('./User')(sequelize, DataTypes),
  Client: require('./Client')(sequelize, DataTypes),
  Professeur: require('./Professeur')(sequelize, DataTypes),
  UserToken: require('./UserToken')(sequelize, DataTypes),
  Notification: require('./Notification')(sequelize, DataTypes),
  Ville: require('./Ville')(sequelize, DataTypes),
  Specialite: require('./Specialite')(sequelize, DataTypes),
  Niveau: require('./Niveau')(sequelize, DataTypes),
  Demande: require('./Demande')(sequelize, DataTypes),
  Assignation: require('./Assignation')(sequelize, DataTypes),
  CreneauHebdo: require('./CreneauHebdo')(sequelize, DataTypes),
  Seance: require('./Seance')(sequelize, DataTypes),
  Paiement: require('./Paiement')(sequelize, DataTypes),
};

Object.values(models).forEach((model) => model.associate?.(models));

module.exports = { sequelize, Sequelize, ...models };
