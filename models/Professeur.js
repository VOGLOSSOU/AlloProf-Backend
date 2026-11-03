module.exports = (sequelize, DataTypes) => {
  const Professeur = sequelize.define('Professeur', {
    userId: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true },
    bio: { type: DataTypes.TEXT, allowNull: true },
    // Le prof accepte-t-il de NOUVELLES assignations (distinct de users.statut)
    disponibilite: {
      type: DataTypes.ENUM('DISPONIBLE', 'INDISPONIBLE'),
      allowNull: false,
      defaultValue: 'DISPONIBLE',
    },
  }, {
    tableName: 'professeurs',
  });

  Professeur.associate = (models) => {
    Professeur.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Professeur.belongsToMany(models.Specialite, {
      through: 'professeur_specialites',
      foreignKey: { name: 'professeurId', field: 'professeur_id' },
      otherKey: { name: 'specialiteId', field: 'specialite_id' },
      as: 'specialites',
    });
    Professeur.belongsToMany(models.Ville, {
      through: 'professeur_villes',
      foreignKey: { name: 'professeurId', field: 'professeur_id' },
      otherKey: { name: 'villeId', field: 'ville_id' },
      as: 'villes',
    });
    Professeur.belongsToMany(models.Niveau, {
      through: 'professeur_niveaux',
      foreignKey: { name: 'professeurId', field: 'professeur_id' },
      otherKey: { name: 'niveauId', field: 'niveau_id' },
      as: 'niveaux',
    });
    Professeur.hasMany(models.Assignation, { foreignKey: 'professeurId', as: 'assignations' });
  };

  return Professeur;
};
