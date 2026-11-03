const { ZodError } = require('zod');
const {
  UniqueConstraintError,
  ForeignKeyConstraintError,
  ValidationError,
  DatabaseError,
} = require('sequelize');
const AppError = require('../utils/AppError');

function notFound(req, res) {
  res.status(404).json({ message: `Route introuvable : ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ message: err.message, details: err.details });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Donnees invalides',
      details: err.issues.map((issue) => ({ champ: issue.path.join('.'), message: issue.message })),
    });
  }

  if (err instanceof UniqueConstraintError) {
    return res.status(409).json({
      message: 'Cette valeur existe deja',
      details: err.errors.map((e) => ({ champ: e.path, message: e.message })),
    });
  }

  if (err instanceof ForeignKeyConstraintError) {
    return res.status(409).json({ message: 'Reference invalide ou ressource encore utilisee' });
  }

  if (err instanceof ValidationError) {
    return res.status(400).json({
      message: 'Donnees invalides',
      details: err.errors.map((e) => ({ champ: e.path, message: e.message })),
    });
  }

  // Violation d'une contrainte CHECK MySQL (ER_CHECK_CONSTRAINT_VIOLATED)
  if (err instanceof DatabaseError && err.original?.errno === 3819) {
    return res.status(400).json({ message: 'Donnees incoherentes', details: err.original.sqlMessage });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'JSON invalide' });
  }

  console.error(err);
  return res.status(500).json({ message: 'Erreur interne du serveur' });
}

module.exports = { notFound, errorHandler };
