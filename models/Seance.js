module.exports = (sequelize, DataTypes) => {
  const Seance = sequelize.define('Seance', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    assignationId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    dateSeance: { type: DataTypes.DATEONLY, allowNull: false },
    heureDebut: { type: DataTypes.TIME, allowNull: false },
    heureFin: { type: DataTypes.TIME, allowNull: false },
    // Genere uniquement le jour J (NULL avant)
    codeSecret: { type: DataTypes.CHAR(6), allowNull: true },
    codeGenereLe: { type: DataTypes.DATE, allowNull: true },
    tentativesEchouees: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    statut: {
      type: DataTypes.ENUM('PREVUE', 'EFFECTUEE', 'MANQUEE', 'ANNULEE'),
      allowNull: false,
      defaultValue: 'PREVUE',
    },
    dateValidation: { type: DataTypes.DATE, allowNull: true },
    motifAnnulation: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'seances',
    timestamps: true,
  });

  // Le code secret n'est visible que du client : on le retire par defaut des reponses
  Seance.prototype.toJSON = function toJSON() {
    const values = { ...this.get() };
    delete values.codeSecret;
    return values;
  };

  Seance.associate = (models) => {
    Seance.belongsTo(models.Assignation, { foreignKey: 'assignationId', as: 'assignation' });
  };

  return Seance;
};
