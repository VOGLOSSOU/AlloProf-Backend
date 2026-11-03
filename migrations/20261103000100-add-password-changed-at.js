'use strict';

// Date du dernier changement de mot de passe : les JWT emis avant sont invalides
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE users ADD COLUMN password_changed_at DATETIME NULL AFTER must_change_password',
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE users DROP COLUMN password_changed_at');
  },
};
