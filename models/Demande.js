module.exports = (sequelize, DataTypes) => {
  const Demande = sequelize.define('Demande', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    clientId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    villeId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    quartier: { type: DataTypes.STRING(120), allowNull: true },
    niveauId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    typeBeneficiaire: { type: DataTypes.ENUM('ENFANT', 'SOI_MEME'), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    budget: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    joursSouhaites: { type: DataTypes.JSON, allowNull: true },
    caracteristiquesProf: { type: DataTypes.TEXT, allowNull: true },
    statut: {
      type: DataTypes.ENUM('EN_ATTENTE', 'EN_RECHERCHE', 'ASSIGNEE', 'ANNULEE', 'REJETEE'),
      allowNull: false,
      defaultValue: 'EN_ATTENTE',
    },
    traiteePar: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    noteAdmin: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'demandes',
    timestamps: true,
  });

  Demande.associate = (models) => {
    Demande.belongsTo(models.Client, { foreignKey: 'clientId', as: 'client' });
    Demande.belongsTo(models.Ville, { foreignKey: 'villeId', as: 'ville' });
    Demande.belongsTo(models.Niveau, { foreignKey: 'niveauId', as: 'niveau' });
    Demande.belongsTo(models.User, { foreignKey: 'traiteePar', as: 'admin' });
    Demande.belongsToMany(models.Specialite, {
      through: 'demande_specialites',
      foreignKey: { name: 'demandeId', field: 'demande_id' },
      otherKey: { name: 'specialiteId', field: 'specialite_id' },
      as: 'specialites',
    });
    Demande.hasMany(models.Assignation, { foreignKey: 'demandeId', as: 'assignations' });
  };

  return Demande;
};
