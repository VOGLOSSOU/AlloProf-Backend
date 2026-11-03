module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    role: { type: DataTypes.ENUM('ADMIN', 'CLIENT', 'PROFESSEUR'), allowNull: false },
    nom: { type: DataTypes.STRING(100), allowNull: false },
    prenom: { type: DataTypes.STRING(100), allowNull: false },
    email: {
      type: DataTypes.STRING(190),
      allowNull: false,
      unique: { name: 'uq_users_email', msg: 'Cet email est deja utilise' },
    },
    telephone: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: { name: 'uq_users_telephone', msg: 'Ce numero de telephone est deja utilise' },
    },
    passwordHash: { type: DataTypes.STRING(255), allowNull: true },
    mustChangePassword: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    // Les JWT emis avant cette date sont refuses (voir middleware/auth.js)
    passwordChangedAt: { type: DataTypes.DATE, allowNull: true },
    statut: { type: DataTypes.ENUM('ACTIF', 'SUSPENDU'), allowNull: false, defaultValue: 'ACTIF' },
  }, {
    tableName: 'users',
    timestamps: true,
  });

  // Le hash du mot de passe ne sort jamais dans une reponse JSON
  User.prototype.toJSON = function toJSON() {
    const values = { ...this.get() };
    delete values.passwordHash;
    return values;
  };

  User.associate = (models) => {
    User.hasOne(models.Client, { foreignKey: 'userId', as: 'client' });
    User.hasOne(models.Professeur, { foreignKey: 'userId', as: 'professeur' });
    User.hasMany(models.UserToken, { foreignKey: 'userId', as: 'tokens' });
    User.hasMany(models.Notification, { foreignKey: 'userId', as: 'notifications' });
    User.hasMany(models.Demande, { foreignKey: 'traiteePar', as: 'demandesTraitees' });
  };

  return User;
};
