require('dotenv').config({ quiet: true });

const app = require('./app');
const { sequelize } = require('./models');
const { startScheduler } = require('./jobs/scheduler');

const PORT = Number(process.env.PORT) || 4000;

async function start() {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET manquant dans .env');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();
    console.log('Connexion MySQL OK');
  } catch (err) {
    console.error('Impossible de se connecter a MySQL :', err.message);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`AlloProf API demarree sur http://localhost:${PORT}/api`);
  });

  if (process.env.DISABLE_JOBS !== 'true') startScheduler();

  const shutdown = async () => {
    server.close();
    await sequelize.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
