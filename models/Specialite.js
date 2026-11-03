module.exports = (sequelize, DataTypes) => {
  const Specialite = sequelize.define('Specialite', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    libelle: { type: DataTypes.STRING(120), allowNull: false, unique: { name: 'uq_specialites_libelle', msg: 'Cette specialite existe deja' } },
    estActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, {
    tableName: 'specialites',
  });

  Specialite.associate = (models) => {
    Specialite.belongsToMany(models.Professeur, {
      through: 'professeur_specialites',
      foreignKey: { name: 'specialiteId', field: 'specialite_id' },
      otherKey: { name: 'professeurId', field: 'professeur_id' },
      as: 'professeurs',
    });
    Specialite.belongsToMany(models.Demande, {
      through: 'demande_specialites',
      foreignKey: { name: 'specialiteId', field: 'specialite_id' },
      otherKey: { name: 'demandeId', field: 'demande_id' },
      as: 'demandes',
    });
  };

  return Specialite;
};
