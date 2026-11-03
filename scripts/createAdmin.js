// Cree (ou met a jour le mot de passe de) l'administrateur defini dans .env
require('dotenv').config({ quiet: true });

const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../models');

async function main() {
  const { ADMIN_NOM, ADMIN_PRENOM, ADMIN_EMAIL, ADMIN_TELEPHONE, ADMIN_PASSWORD } = process.env;

  if (!ADMIN_EMAIL || !ADMIN_TELEPHONE || !ADMIN_PASSWORD) {
    throw new Error('ADMIN_EMAIL, ADMIN_TELEPHONE et ADMIN_PASSWORD doivent etre definis dans .env');
  }
  if (ADMIN_PASSWORD.length < 10) {
    throw new Error('ADMIN_PASSWORD doit contenir au moins 10 caracteres');
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const existing = await User.findOne({ where: { email: ADMIN_EMAIL } });

  if (existing) {
    if (existing.role !== 'ADMIN') {
      throw new Error(`${ADMIN_EMAIL} existe deja avec le role ${existing.role}`);
    }
    await existing.update({ passwordHash });
    console.log(`Mot de passe de l'admin ${ADMIN_EMAIL} mis a jour`);
    return;
  }

  await User.create({
    role: 'ADMIN',
    nom: ADMIN_NOM || 'Admin',
    prenom: ADMIN_PRENOM || 'AlloProf',
    email: ADMIN_EMAIL,
    telephone: ADMIN_TELEPHONE,
    passwordHash,
  });
  console.log(`Admin ${ADMIN_EMAIL} cree`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
