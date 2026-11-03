const bcrypt = require('bcryptjs');

const ROUNDS = 12;

// Hash factice compare quand l'utilisateur n'existe pas : la reponse prend
// le meme temps, on ne peut pas deviner quels emails sont inscrits
const DUMMY_HASH = bcrypt.hashSync('alloprof-dummy-password', ROUNDS);

function hashPassword(plain) {
  return bcrypt.hash(plain, ROUNDS);
}

async function verifyPassword(plain, hash) {
  const ok = await bcrypt.compare(plain, hash || DUMMY_HASH);
  return Boolean(hash) && ok;
}

module.exports = { hashPassword, verifyPassword };
