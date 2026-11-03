# AlloProf — Brief frontend

> Document 1/3. À lire en premier. Les deux autres :
> - `02-API.md` : toutes les routes, leurs entrées et leurs réponses exactes.
> - `03-ECRANS-ET-PARCOURS.md` : chaque écran, les appels qu'il fait et les règles d'interface.

## 1. Le produit

AlloProf met en relation des familles (ou des adultes) avec des **professeurs de maison**, au Bénin (villes : Cotonou, Abomey-Calavi, Porto-Novo, Parakou ; monnaie : FCFA ; fuseau : `Africa/Porto-Novo`, UTC+1).

Ce n'est **pas un catalogue** : le client ne choisit pas son prof. Le parcours est le suivant.

1. Le **client** s'inscrit puis fait une **demande** : ville, quartier, niveau scolaire, matières, budget, jours souhaités, attentes sur le prof.
2. L'**admin** reçoit la demande, trouve un prof dans la vraie vie, puis **crée le compte du prof** sur la plateforme. Le prof reçoit un lien d'invitation et choisit son mot de passe.
3. L'admin **assigne** le prof à la demande : il fixe les tarifs et un **planning hebdomadaire** (ex. lundi 16h-18h, jeudi 16h-18h). Le backend génère alors les **séances** réelles du mois en cours et du mois suivant.
4. Le jour d'un cours, le **client** ouvre l'appli et voit un **code secret à 6 chiffres**, qu'il donne au prof. Le **prof** saisit ce code dans son appli, ce qui **valide sa présence**. Une séance non validée le jour même passe automatiquement en `MANQUEE` la nuit suivante.
5. Les **paiements** se font hors plateforme (Mobile Money, espèces, virement). L'admin les **enregistre** : le client paie l'admin, et l'admin paie le prof une fois son mois terminé. Un **récap mensuel** calcule ce qui est dû.

Le backend est **terminé et testé** sur une vraie base. Le frontend ne contient **aucune logique métier critique** : il affiche, collecte et appelle l'API. En cas de doute sur une règle, l'API fait foi et renvoie une erreur explicite à afficher.

## 2. Les trois rôles

Un compte a **un seul rôle**, fixé à la création.

| Rôle | Comment le compte est créé | Usage principal | Support |
|---|---|---|---|
| `CLIENT` | Inscription publique (`/inscription`) | Faire une demande, suivre, donner le code du jour | **Mobile d'abord** |
| `PROFESSEUR` | Créé par l'admin, puis activé via le lien d'invitation | Voir son calendrier, valider avec le code | **Mobile d'abord** |
| `ADMIN` | Script côté serveur, pas d'inscription | Tout gérer (back-office) | **Desktop d'abord** |

Un prof n'est **jamais** un client « promu ». C'est voulu (cahier des charges) : ne pas proposer d'inscription prof sur le site.

## 3. Stack décidée

- **Next.js** (App Router) + **TypeScript** strict.
- **Tailwind CSS** + **shadcn/ui** (composants), **lucide-react** (icônes).
- **TanStack Query** pour tous les appels API (cache, états de chargement, invalidation après mutation).
- **React Hook Form** + **Zod** pour les formulaires (`@hookform/resolvers/zod`).
- **date-fns** avec la locale `fr` pour les dates.
- Pas de state manager global : TanStack Query pour les données serveur, un contexte pour la session.

L'API est un backend séparé (Express) : Next.js sert ici d'application cliente. Les pages authentifiées sont des **composants client** (`"use client"`). Seule la page d'accueil publique gagne à être rendue côté serveur (SEO).

## 4. Connexion avec le backend

- URL de l'API dans `.env.local` : `NEXT_PUBLIC_API_URL=http://localhost:4000/api`.
- Le backend tourne avec `npm run dev` dans `../AlloProf-Backend` (port 4000). Il est déjà branché sur une base MariaDB de dev hébergée chez Hostinger.
- **CORS** : le backend autorise les origines listées dans `CORS_ORIGINS` (son `.env`), par défaut `http://localhost:3000` et `http://localhost:5173`. Si le front tourne sur un autre port, il faut l'ajouter là-bas.
- **Lien d'invitation des profs** : le backend le construit avec `FRONT_URL` (par défaut `http://localhost:3000`) sous la forme `/invitation?token=...`. Le front **doit** avoir cette route exacte.
- **Pas d'email pour l'instant.** L'invitation n'est pas envoyée par email : l'API renvoie le lien à l'admin, qui le **copie et l'envoie au prof par WhatsApp**. Le « mot de passe oublié » (qui, lui, passe par email) est **mis de côté** : ne pas construire ses pages pour l'instant (voir `03-ECRANS-ET-PARCOURS.md`).

### Client HTTP

Un seul module (ex. `lib/api.ts`) qui :

1. préfixe avec `NEXT_PUBLIC_API_URL` ;
2. ajoute `Authorization: Bearer <token>` si une session existe ;
3. envoie et lit du JSON ;
4. sur une réponse non `2xx`, lève une `ApiError` avec `status`, `message` et `details` (format en section 4 de `02-API.md`) ;
5. sur un **401** pour une route authentifiée, vide la session et redirige vers `/connexion` (session expirée, mot de passe changé ailleurs, etc.).

### Session

- `POST /auth/login` (et `/auth/register`, `/auth/invitation/accept`, `/auth/password/change`) renvoie `{ token, user }`.
- Stocker le **token** dans `localStorage` (clé `alloprof_token`) et le **user** dans un contexte React `AuthProvider`. Au chargement de l'appli, s'il y a un token, appeler `GET /auth/me` pour récupérer l'utilisateur à jour (et vérifier que le token est toujours valide).
- Le JWT dure 7 jours. Il n'y a pas de refresh token : à l'expiration, on renvoie vers la connexion.
- Choix assumé pour aller vite : pas de cookie httpOnly ni de proxy Next.js. Ne jamais injecter de HTML venant de l'API (`dangerouslySetInnerHTML`), pour limiter le risque XSS.

### Protection des routes

- Un composant `RequireRole role="CLIENT" | "PROFESSEUR" | "ADMIN"` dans le layout de chaque espace. S'il n'y a pas de session, il redirige vers `/connexion?next=<url>`. Si le rôle n'est pas le bon, il redirige vers l'espace du rôle de l'utilisateur.
- Après connexion, rediriger selon `user.role` : `CLIENT` vers `/client`, `PROFESSEUR` vers `/prof`, `ADMIN` vers `/admin`. Respecter `next` s'il correspond au bon espace.
- Le backend revérifie tout (rôle et propriété des données) : la protection côté front n'est qu'un confort.

## 5. Arborescence proposée

```
app/
  (public)/
    page.tsx                      accueil
    connexion/page.tsx
    inscription/page.tsx
    invitation/page.tsx           ?token=  (activation prof)
  client/                         layout mobile + RequireRole CLIENT
    page.tsx                      tableau de bord (code du jour en premier)
    demandes/page.tsx
    demandes/nouvelle/page.tsx
    demandes/[id]/page.tsx
    calendrier/page.tsx
    paiements/page.tsx
  prof/                           layout mobile + RequireRole PROFESSEUR
    page.tsx                      séances du jour + validation
    calendrier/page.tsx
    missions/page.tsx
    paiements/page.tsx
  admin/                          layout desktop (sidebar) + RequireRole ADMIN
    page.tsx                      tableau de bord
    demandes/page.tsx
    demandes/[id]/page.tsx        détail + profs compatibles + bouton Assigner
    professeurs/page.tsx
    professeurs/nouveau/page.tsx
    professeurs/[id]/page.tsx
    clients/page.tsx
    clients/[id]/page.tsx
    assignations/page.tsx
    assignations/nouvelle/page.tsx   ?demandeId=&professeurId=
    assignations/[id]/page.tsx    planning, séances, récap, paiements
    paiements/page.tsx
    referentiels/page.tsx         villes, matières, niveaux (onglets)
  compte/page.tsx                 profil + changer mot de passe (tous rôles)
components/
  ui/                             shadcn
  ...                             composants métier (StatutBadge, CreneauxEditor, CodeDuJour...)
lib/
  api.ts                          client HTTP + ApiError
  auth.tsx                        AuthProvider, useAuth, RequireRole
  types.ts                        types des objets de l'API (voir 02-API.md)
  labels.ts                       libellés et couleurs des enums (voir 03)
  format.ts                       formatMontant, formatDate, formatHeure
hooks/                            hooks TanStack Query par domaine (useDemandes, useSeances...)
```

## 6. Conventions à respecter

- **Langue** : toute l'interface est en **français**. Les valeurs d'enum (`EN_ATTENTE`, `PREVUE`...) ne s'affichent **jamais** telles quelles : passer par `lib/labels.ts`.
- **Montants** : l'API renvoie les décimaux le plus souvent sous forme de **chaîne** (`"5000.00"`), parfois en nombre (juste après une création). Toujours passer par `Number()`, puis formater avec `Intl.NumberFormat('fr-FR')` suivi de ` FCFA` (ex. `5 000 FCFA`). Pas de décimales à l'affichage.
- **Dates** :
  - les dates métier (`dateSeance`, `dateDebut`...) sont des chaînes `AAAA-MM-JJ` : ne **pas** les passer à `new Date()` sans précaution (décalage de fuseau), utiliser `parseISO` de date-fns ;
  - les horodatages (`createdAt`, `dateValidation`...) sont en ISO UTC ;
  - les heures sont au format `HH:MM:SS` : afficher `HH:MM` (ou `16h00`).
- **Jours de la semaine** : `jourSemaine` va de 1 à 7, **1 = lundi**, 7 = dimanche (ISO).
- **Erreurs** : afficher `error.message` dans un toast. Pour un formulaire, mapper `error.details[].champ` sur les champs (`setError`). Voir `02-API.md`, section 4.
- **Mutations** : après chaque mutation réussie, invalider les requêtes TanStack concernées et afficher un toast de succès.
- **États** : chaque liste a un état de chargement (skeleton), un état vide (texte utile et action) et un état d'erreur (message et bouton Réessayer).
- **Pagination** : les listes paginées renvoient `{ data, total, page, limit }`. Utiliser `?page=` dans l'URL.

## 7. Design

Il n'y a pas encore de maquette ni de charte : partir sur un design **sobre, clair et professionnel**, facile à rhabiller ensuite.

- Une couleur primaire (variable CSS shadcn, ex. bleu `#2563EB`), des fonds clairs, des cartes arrondies.
- Client et prof : **mobile-first**, gros boutons, navigation en barre en bas (4 entrées max). La plupart des utilisateurs sont sur téléphone, parfois avec une connexion lente : peu d'images, pages légères.
- Admin : sidebar à gauche et tableaux denses avec filtres (`DataTable` de shadcn).
- Les statuts s'affichent toujours en **badges colorés** (couleurs dans `03-ECRANS-ET-PARCOURS.md`).

## 8. Ordre de construction (valider chaque étape avant la suivante)

1. **Socle** : projet Next.js, Tailwind et shadcn, `lib/api.ts`, `AuthProvider`, pages connexion et inscription, `RequireRole`, layouts des trois espaces, redirection par rôle, page `/compte` (changer de mot de passe).
2. **Client** : nouvelle demande, liste et détail des demandes, annulation.
3. **Admin, cœur du métier** : liste et détail des demandes, changement de statut, création de prof (avec affichage et copie du lien d'invitation), profs compatibles, **création d'assignation avec l'éditeur de créneaux**.
4. **Prof et code du jour** : page `/invitation`, séances du jour et validation par code côté prof, code du jour côté client, calendriers mensuels.
   - Le parcours complet est alors démontrable : demande → assignation → séance validée.
5. **Le reste** : détail d'assignation (planning, suspension, fin, séances, récap), paiements (admin, client, prof), notifications (cloche et liste), référentiels, listes profs et clients, suspension de compte, page d'accueil.

## 9. Comptes pour tester

- **Admin** : `gilbert@alloprof.com`. Le mot de passe est dans le `.env` du backend (`ADMIN_PASSWORD`) ; ne jamais le recopier dans le code du front.
- **Client** : en créer un via `/inscription`.
- **Prof** : le créer depuis l'admin. La réponse contient `invitation.lien` : l'ouvrir en navigation privée pour activer le compte, comme le ferait le prof depuis WhatsApp.
- Pour tester le code du jour, l'assignation doit avoir un créneau **le jour de la semaine actuel**, avec `dateDebut` égale à aujourd'hui ou avant.
- Limite anti-abus : 10 tentatives par 15 minutes et par IP sur connexion, inscription et invitation. Au-delà, l'API renvoie un **429**. Redémarrer le backend remet le compteur à zéro.
