# AlloProf - Backend

API de la plateforme AlloProf : mise en relation de clients avec des professeurs de maison, planning des séances, émargement par code secret et suivi des paiements.

Stack : Node.js (>= 20), Express 5, Sequelize 6, MySQL 8.0.16+ ou MariaDB 10.5+ (dev : MariaDB 11.8 chez Hostinger).

## Démarrage

```bash
npm install
cp .env.example .env        # puis renseigner DB_* , JWT_SECRET et ADMIN_*
npm run db:create           # crée la base en utf8mb4 (inutile chez Hostinger : base créée dans hPanel)
npm run db:migrate          # crée les tables
npm run db:seed             # villes, spécialités et niveaux de départ
npm run admin:create        # crée le compte administrateur défini dans .env
npm run dev                 # http://localhost:4000/api/health
npm test                    # tests (sans base de données)
npm run jobs:run            # lance à la main les tâches quotidiennes
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
services/      logique métier (planning, séances, paiements, notifications, emails...)
validators/    schémas Zod des entrées
jobs/          tâches planifiées (node-cron)
utils/         utilitaires (AppError, dates, fragments de requêtes...)
scripts/       scripts ponctuels (création admin)
tests/         tests Jest + Supertest
docs/          cahier des charges et modélisation
```

## Conventions

- Le schéma évolue **uniquement par migration** (`npx sequelize-cli migration:generate --name ...`), jamais avec `sequelize.sync()` : les contraintes `CHECK` et la colonne générée `assignations.active_demande_id` n'existent que dans les migrations.
- Les attributs JS sont en camelCase, les colonnes en snake_case (`underscored: true`).
- Les erreurs métier se lèvent avec `AppError` (`throw AppError.notFound('Demande introuvable')`) ; le middleware `errorHandler` traduit aussi les erreurs Zod et Sequelize en réponses JSON propres.
- `User.toJSON()` retire `passwordHash` et `Seance.toJSON()` retire `codeSecret` : le code n'est renvoyé explicitement qu'au client concerné.
- Dates métier (`date_seance`, `date_debut`...) manipulées en chaînes `AAAA-MM-JJ` ; « aujourd'hui » = date locale du fuseau `TZ` du `.env`.
- Chaque connexion MySQL passe en mode strict (`config/database.js`) : certains hébergeurs ne l'activent pas et tronqueraient les valeurs invalides en silence.
- Inclure les relations via les fonctions de `utils/query.js` : Sequelize modifie les objets d'include, ne jamais partager le même objet entre deux includes.

## API

Toutes les routes sont préfixées par `/api`. JWT dans l'en-tête `Authorization: Bearer <token>` ; changer son mot de passe invalide les jetons émis avant. Les listes paginées acceptent `?page=&limit=` (max 100) et renvoient `{ data, total, page, limit }`.

### Public & authentification

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/referentiels` | Villes, spécialités, niveaux actifs (formulaire de demande) |
| POST | `/auth/register` | Inscription d'un client |
| POST | `/auth/login` | Connexion par email **ou** téléphone (`identifiant`, `password`) |
| GET | `/auth/me` | Utilisateur connecté + profil |
| POST | `/auth/password/change` | Renvoie un nouveau jeton |
| POST | `/auth/password/forgot` | Lien de reset par email (valable 1 h). **En attente** : pas de SMTP configuré pour l'instant |
| POST | `/auth/password/reset` | `token` + nouveau `password` |
| POST | `/auth/invitation/accept` | Le prof choisit son mot de passe (lien valable 7 j) |
| GET | `/notifications?nonLues=true` | Notifications de l'utilisateur connecté (+ compteur `nonLues`) |
| POST | `/notifications/:id/lire` · `/notifications/lire-tout` | Marquer comme lu |

Connexion, inscription, reset et invitation sont limités à 10 requêtes / 15 min / IP.

**Emails : désactivés pour l'instant.** L'invitation des profs ne passe pas par email : l'API renvoie le lien (et un message prêt à coller) à l'admin, qui l'envoie au prof par WhatsApp. Seul « mot de passe oublié » utilise l'email ; son code est conservé, et sans variables `SMTP_*` le message est seulement écrit dans les logs. Pour l'activer plus tard : ajouter `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` et `MAIL_FROM` au `.env` (voir `services/emailService.js`).

### Client (`/client`, rôle CLIENT)

| Méthode | Route | Rôle |
|---|---|---|
| POST | `/client/demandes` | Nouvelle demande (ville, niveau, spécialités, budget, jours souhaités...) |
| GET | `/client/demandes?statut=` | Ses demandes |
| GET | `/client/demandes/:id` | Détail + prof assigné et planning (sans le tarif prof) |
| POST | `/client/demandes/:id/annuler` | Possible tant que la demande n'est pas assignée |
| GET | `/client/seances?annee=&mois=` | Calendrier du mois |
| GET | `/client/seances/aujourdhui` | Séances du jour **avec le code secret** à transmettre au prof |
| GET | `/client/paiements` | Ses paiements |

### Professeur (`/prof`, rôle PROFESSEUR)

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/prof/assignations?statut=` | Ses missions (client, adresse, planning ; sans le tarif client). Par défaut : hors terminées |
| GET | `/prof/seances?annee=&mois=` | Calendrier du mois |
| POST | `/prof/seances/:id/valider` | `{ code }` : valide la présence (le jour J uniquement, bloqué après 5 erreurs) |
| GET | `/prof/paiements` | Paiements reçus |

### Admin (`/admin`, rôle ADMIN)

| Méthode | Route | Rôle |
|---|---|---|
| GET · POST · PATCH | `/admin/villes` · `/admin/specialites` · `/admin/niveaux` | Référentiels (pas de suppression : `estActive: false`) |
| GET | `/admin/demandes?statut=&villeId=` | Demandes avec le client |
| GET · PATCH | `/admin/demandes/:id` | Détail · `statut` (EN_ATTENTE, EN_RECHERCHE, REJETEE) et `noteAdmin` |
| GET | `/admin/demandes/:id/professeurs-compatibles` | Profs disponibles de la ville et du niveau, triés par spécialités couvertes puis charge |
| GET · POST | `/admin/professeurs` | Liste (filtres `q`, `villeId`, `specialiteId`, `niveauId`, `disponibilite`) · création + invitation |
| GET · PATCH | `/admin/professeurs/:id` | Détail (avec assignations) · modification (infos, disponibilité, référentiels) |
| POST | `/admin/professeurs/:id/invitation` | Régénère l'invitation |
| GET | `/admin/clients?q=` · `/admin/clients/:id` | Clients et leurs demandes |
| PATCH | `/admin/users/:id/statut` | `ACTIF` / `SUSPENDU` (effet immédiat) |
| GET · POST | `/admin/assignations` | Liste · création (`creneaux` hebdo, tarifs, `uniteTarif`) : génère les séances du mois et du mois suivant |
| GET · PATCH | `/admin/assignations/:id` | Détail + paiements · `dateFin`, tarifs |
| PATCH | `/admin/assignations/:id/statut` | `SUSPENDUE` (annule les séances à venir), `ACTIVE` (les restaure), `TERMINEE` (+ `relancerDemande`) |
| PUT | `/admin/assignations/:id/creneaux` | Remplace le planning (séances futures recréées) |
| POST | `/admin/assignations/:id/seances` | `{ annee, mois }` : planifie un mois plus lointain |
| GET | `/admin/assignations/:id/recap?annee=&mois=` | Séances du mois, montants dus / payés / restants client et prof, marge, `moisComplet` |
| GET · PATCH | `/admin/seances?annee=&mois=` · `/admin/seances/:id` | Calendrier · correction (`statut`, `motifAnnulation`, `debloquer`) |
| GET · POST · PATCH · DELETE | `/admin/paiements` | Paiements (`sens` CLIENT_VERS_ADMIN / ADMIN_VERS_PROF, plusieurs tranches possibles) |

### Règles appliquées par l'API

- Un prof ne peut pas avoir deux créneaux qui se chevauchent sur ses assignations actives ; une demande n'a qu'une assignation active.
- Le code secret d'une séance est généré au premier affichage par le client le jour J. Le prof ne peut valider que ce jour-là ; après 5 codes faux la séance est bloquée et l'admin prévenu (déblocage : `PATCH /admin/seances/:id { debloquer: true }`).
- Chaque nuit à 00:05 (et au démarrage) : les séances non validées des jours passés passent `MANQUEE`, et les séances du mois courant et suivant sont générées. `DISABLE_JOBS=true` désactive ces tâches.
- Les notifications sont créées automatiquement : nouvelle demande / annulation (admin), changement de statut de demande (client), assignation et planning (client + prof), séance validée (client), blocage (admin), paiement réglé (destinataire).

## Documentation

La modélisation et les règles de gestion sont dans [docs/alloprof_modelisation.md](docs/alloprof_modelisation.md).
