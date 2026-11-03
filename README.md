# AlloProf - Backend

API de la plateforme AlloProf : mise en relation de clients avec des professeurs de maison, planning des séances, émargement par code secret et suivi des paiements.

Stack : Node.js (>= 20), Express 5, Sequelize 6, MySQL 8.0.16+.

## Démarrage

```bash
npm install
cp .env.example .env        # puis renseigner DB_* , JWT_SECRET et ADMIN_*
npm run db:create           # crée la base en utf8mb4
npm run db:migrate          # crée les tables
npm run db:seed             # villes, spécialités et niveaux de départ
npm run admin:create        # crée le compte administrateur défini dans .env
npm run dev                 # http://localhost:4000/api/health
```

## Structure

```
config/        configuration Sequelize (app + sequelize-cli)
models/        modèles Sequelize et associations
migrations/    évolutions du schéma (source de vérité de la base)
seeders/       données de référence
controllers/   logique des routes
routes/        déclaration des routes (préfixe /api)
middleware/    auth, gestion d'erreurs...
services/      logique métier réutilisable (emails, génération des séances...)
utils/         utilitaires (AppError...)
scripts/       scripts ponctuels (création admin)
tests/         tests Jest + Supertest
docs/          cahier des charges et modélisation
```

## Conventions

- Le schéma évolue **uniquement par migration** (`npx sequelize-cli migration:generate --name ...`), jamais avec `sequelize.sync()` : les contraintes `CHECK` et la colonne générée `assignations.active_demande_id` n'existent que dans les migrations.
- Les attributs JS sont en camelCase, les colonnes en snake_case (`underscored: true`).
- Les erreurs métier se lèvent avec `AppError` (`throw AppError.notFound('Demande introuvable')`) ; le middleware `errorHandler` traduit aussi les erreurs Zod et Sequelize en réponses JSON propres.
- `User.toJSON()` retire `passwordHash` et `Seance.toJSON()` retire `codeSecret` : le code n'est renvoyé explicitement qu'au client concerné.

## Documentation

La modélisation et les règles de gestion sont dans [docs/alloprof_modelisation.md](docs/alloprof_modelisation.md).
