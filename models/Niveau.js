module.exports = (sequelize, DataTypes) => {
  const Niveau = sequelize.define('Niveau', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    libelle: { type: DataTypes.STRING(100), allowNull: false, unique: { name: 'uq_niveaux_libelle', msg: 'Ce niveau existe deja' } },
    // Permet de comparer les niveaux (CI < CP < ... < Terminale < Universite)
    ordre: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false },
    estActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, {
    tableName: 'niveaux',
  });

  Niveau.associate = (models) => {
    Niveau.hasMany(models.Demande, { foreignKey: 'niveauId', as: 'demandes' });
    Niveau.belongsToMany(models.Professeur, {
      through: 'professeur_niveaux',
      foreignKey: { name: 'niveauId', field: 'niveau_id' },
      otherKey: { name: 'professeurId', field: 'professeur_id' },
      as: 'professeurs',
    });
  };

  return Niveau;
};
