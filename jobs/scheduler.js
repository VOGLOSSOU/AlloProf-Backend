const cron = require('node-cron');
const { marquerSeancesManquees, genererSeancesAVenir } = require('../services/seanceService');

async function runDailyJobs() {
  const manquees = await marquerSeancesManquees();
  const assignations = await genererSeancesAVenir();
  console.log(`[jobs] ${manquees} seance(s) marquee(s) MANQUEE, seances a venir generees pour ${assignations} assignation(s)`);
}

function startScheduler() {
  // Chaque nuit a 00:05 (heure locale, TZ du .env)
  cron.schedule('5 0 * * *', () => runDailyJobs().catch((err) => console.error('[jobs]', err)));
  // Rattrapage au demarrage (serveur eteint a minuit, deploiement...)
  runDailyJobs().catch((err) => console.error('[jobs]', err));
}

module.exports = { runDailyJobs, startScheduler };

// `npm run jobs:run` : execution manuelle
if (require.main === module) {
  require('dotenv').config({ quiet: true });
  const { sequelize } = require('../models');
  runDailyJobs()
    .catch((err) => { console.error(err); process.exitCode = 1; })
    .finally(() => sequelize.close());
}
