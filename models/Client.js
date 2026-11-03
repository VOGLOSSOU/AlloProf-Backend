module.exports = (sequelize, DataTypes) => {
  const Client = sequelize.define('Client', {
    userId: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true },
    adresse: { type: DataTypes.STRING(255), allowNull: true },
  }, {
    tableName: 'clients',
  });

  Client.associate = (models) => {
    Client.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Client.hasMany(models.Demande, { foreignKey: 'clientId', as: 'demandes' });
  };

  return Client;
};
