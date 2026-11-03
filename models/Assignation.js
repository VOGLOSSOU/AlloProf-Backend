module.exports = (sequelize, DataTypes) => {
  // La colonne generee active_demande_id (unicite de l'assignation ACTIVE)
  // est geree par MySQL : elle n'est volontairement pas declaree ici.
  const Assignation = sequelize.define('Assignation', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    demandeId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    professeurId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    dateDebut: { type: DataTypes.DATEONLY, allowNull: false },
    dateFin: { type: DataTypes.DATEONLY, allowNull: true },
    uniteTarif: { type: DataTypes.ENUM('SEANCE', 'HEURE', 'MOIS'), allowNull: false },
    tarifClient: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    tarifProf: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    statut: {
      type: DataTypes.ENUM('ACTIVE', 'SUSPENDUE', 'TERMINEE'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
  }, {
    tableName: 'assignations',
    timestamps: true,
  });

  Assignation.associate = (models) => {
    Assignation.belongsTo(models.Demande, { foreignKey: 'demandeId', as: 'demande' });
    Assignation.belongsTo(models.Professeur, { foreignKey: 'professeurId', as: 'professeur' });
    Assignation.hasMany(models.CreneauHebdo, { foreignKey: 'assignationId', as: 'creneaux' });
    Assignation.hasMany(models.Seance, { foreignKey: 'assignationId', as: 'seances' });
    Assignation.hasMany(models.Paiement, { foreignKey: 'assignationId', as: 'paiements' });
  };

  return Assignation;
};
