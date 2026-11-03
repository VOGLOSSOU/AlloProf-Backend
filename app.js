const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { version } = require('./package.json');

const app = express();

const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Page d'accueil de l'API (ex. ouverture de l'URL dans un navigateur)
app.get('/', (req, res) => {
  res.json({
    message: "Bienvenue sur l'API AlloProf",
    statut: 'en ligne',
    version,
    sante: '/api/health',
  });
});

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
