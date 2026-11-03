module.exports = (sequelize, DataTypes) => {
  const CreneauHebdo = sequelize.define('CreneauHebdo', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    assignationId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    // 1 = lundi ... 7 = dimanche
    jourSemaine: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
    heureDebut: { type: DataTypes.TIME, allowNull: false },
    heureFin: { type: DataTypes.TIME, allowNull: false },
  }, {
    tableName: 'creneaux_hebdo',
  });

  CreneauHebdo.associate = (models) => {
    CreneauHebdo.belongsTo(models.Assignation, { foreignKey: 'assignationId', as: 'assignation' });
  };

  return CreneauHebdo;
};
