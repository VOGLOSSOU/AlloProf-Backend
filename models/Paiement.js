module.exports = (sequelize, DataTypes) => {
  const Paiement = sequelize.define('Paiement', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    assignationId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    sens: { type: DataTypes.ENUM('CLIENT_VERS_ADMIN', 'ADMIN_VERS_PROF'), allowNull: false },
    mois: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
    annee: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
    montant: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    mode: { type: DataTypes.ENUM('MOBILE_MONEY', 'ESPECES', 'VIREMENT'), allowNull: true },
    reference: { type: DataTypes.STRING(100), allowNull: true },
    statut: { type: DataTypes.ENUM('EN_ATTENTE', 'PAYE'), allowNull: false, defaultValue: 'EN_ATTENTE' },
    commentaire: { type: DataTypes.STRING(255), allowNull: true },
    datePaiement: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'paiements',
    timestamps: true,
  });

  Paiement.associate = (models) => {
    Paiement.belongsTo(models.Assignation, { foreignKey: 'assignationId', as: 'assignation' });
  };

  return Paiement;
};
