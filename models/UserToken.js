module.exports = (sequelize, DataTypes) => {
  const UserToken = sequelize.define('UserToken', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    type: { type: DataTypes.ENUM('INVITATION', 'RESET_PASSWORD', 'OTP'), allowNull: false },
    // Empreinte SHA-256 du jeton : le jeton en clair n'est jamais stocke
    tokenHash: { type: DataTypes.CHAR(64), allowNull: false, unique: true },
    tentatives: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    usedAt: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'user_tokens',
    timestamps: true,
    updatedAt: false,
  });

  UserToken.associate = (models) => {
    UserToken.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return UserToken;
};
