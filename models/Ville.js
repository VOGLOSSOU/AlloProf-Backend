module.exports = (sequelize, DataTypes) => {
  const Ville = sequelize.define('Ville', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    nom: { type: DataTypes.STRING(120), allowNull: false, unique: { name: 'uq_villes_nom', msg: 'Cette ville existe deja' } },
    estActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, {
    tableName: 'villes',
  });

  Ville.associate = (models) => {
    Ville.hasMany(models.Demande, { foreignKey: 'villeId', as: 'demandes' });
    Ville.belongsToMany(models.Professeur, {
      through: 'professeur_villes',
      foreignKey: { name: 'villeId', field: 'ville_id' },
      otherKey: { name: 'professeurId', field: 'professeur_id' },
      as: 'professeurs',
    });
  };

  return Ville;
};
