# AlloProf — Référence de l'API

> Document 2/3. Formes exactes des requêtes et des réponses, relevées dans le code du backend (`../AlloProf-Backend`).
> En cas de doute, lire `routes/`, `validators/` (règles de validation Zod) et `controllers/` du backend.

## 1. Généralités

- **Base URL** : `NEXT_PUBLIC_API_URL`, en dev `http://localhost:4000/api`. Toutes les routes ci-dessous sont relatives à cette base.
- **Format** : JSON en entrée comme en sortie (`Content-Type: application/json`).
- **Auth** : en-tête `Authorization: Bearer <token>` sur toutes les routes, sauf celles marquées **public**.
- **Noms de champs** : en camelCase partout.
- **Ids** : nombres entiers. Pour un client ou un prof, l'id du profil **est** l'id de l'utilisateur (`userId` = `user.id`).
- **Champs optionnels** : un champ absent d'un `PATCH` n'est pas modifié ; `null` efface la valeur (quand le champ l'autorise).

### Types de valeurs

| Type | Format | Exemple |
|---|---|---|
| Date métier | `AAAA-MM-JJ` | `"2026-11-03"` |
| Heure | `HH:MM:SS` en sortie. En entrée, `HH:MM` ou `HH:MM:SS` | `"16:00:00"` |
| Horodatage | ISO 8601 UTC | `"2026-11-03T12:04:55.978Z"` |
| Montant | chaîne décimale en lecture (`"5000.00"`), parfois nombre juste après une création : **toujours `Number()`**. En entrée, un nombre | `5000` |
| Booléen MySQL calculé | `0` ou `1` (uniquement `compteActive`) | `1` |

### Pagination

Les routes marquées *paginée* acceptent `?page=` (défaut 1) et `?limit=` (défaut 20, max 100) et renvoient :

```ts
{ data: T[]; total: number; page: number; limit: number }
```

## 2. Enums

```ts
type Role = 'ADMIN' | 'CLIENT' | 'PROFESSEUR';
type StatutCompte = 'ACTIF' | 'SUSPENDU';
type Disponibilite = 'DISPONIBLE' | 'INDISPONIBLE';
type TypeBeneficiaire = 'ENFANT' | 'SOI_MEME';
type JourSouhaite = 'LUNDI' | 'MARDI' | 'MERCREDI' | 'JEUDI' | 'VENDREDI' | 'SAMEDI' | 'DIMANCHE';
type StatutDemande = 'EN_ATTENTE' | 'EN_RECHERCHE' | 'ASSIGNEE' | 'ANNULEE' | 'REJETEE';
type StatutAssignation = 'ACTIVE' | 'SUSPENDUE' | 'TERMINEE';
type UniteTarif = 'SEANCE' | 'HEURE' | 'MOIS';
type StatutSeance = 'PREVUE' | 'EFFECTUEE' | 'MANQUEE' | 'ANNULEE';
type SensPaiement = 'CLIENT_VERS_ADMIN' | 'ADMIN_VERS_PROF';
type ModePaiement = 'MOBILE_MONEY' | 'ESPECES' | 'VIREMENT';
type StatutPaiement = 'EN_ATTENTE' | 'PAYE';
type JourSemaine = 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1 = lundi ... 7 = dimanche
type TypeNotification =
  | 'NOUVELLE_DEMANDE' | 'DEMANDE_ANNULEE' | 'SEANCE_BLOQUEE'           // reçues par l'admin
  | 'DEMANDE_STATUT' | 'SEANCE_VALIDEE' | 'PAIEMENT_ENREGISTRE'         // reçues par le client
  | 'PAIEMENT_RECU'                                                     // reçue par le prof
  | 'NOUVELLE_ASSIGNATION' | 'ASSIGNATION_STATUT' | 'PLANNING_MODIFIE'; // client + prof
```

## 3. Objets

```ts
interface UserPublic {            // utilisateur imbriqué dans un autre objet
  id: number; nom: string; prenom: string; email: string; telephone: string; statut: StatutCompte;
}

interface User extends UserPublic { // utilisateur connecté (/auth/*)
  role: Role;
  mustChangePassword: boolean;
  passwordChangedAt: string | null;
  createdAt: string; updatedAt: string;
  client: Client | null;           // présent si role = CLIENT
  professeur: ProfesseurAvecReferentiels | null; // présent si role = PROFESSEUR
}

interface Client { userId: number; adresse: string | null; user?: UserPublic }

interface Professeur { userId: number; bio: string | null; disponibilite: Disponibilite; user?: UserPublic }
interface ProfesseurAvecReferentiels extends Professeur {
  specialites: Specialite[]; villes: Ville[]; niveaux: Niveau[];
}

interface Ville { id: number; nom: string; estActive: boolean }
interface Specialite { id: number; libelle: string; estActive: boolean }
interface Niveau { id: number; libelle: string; ordre: number; estActive: boolean } // trier par ordre

interface Demande {
  id: number; clientId: number; villeId: number; niveauId: number;
  quartier: string | null;
  typeBeneficiaire: TypeBeneficiaire;
  description: string;
  budget: string | null;              // absent pour le PROF
  joursSouhaites: JourSouhaite[] | null;
  caracteristiquesProf: string | null;
  statut: StatutDemande;
  traiteePar: number | null;          // ADMIN uniquement
  noteAdmin: string | null;           // ADMIN uniquement (note interne)
  createdAt: string; updatedAt: string;
  ville: Ville; niveau: Niveau; specialites: Specialite[];
  client?: Client & { user: UserPublic };  // vues admin et prof
}

interface Assignation {
  id: number; demandeId: number; professeurId: number;
  dateDebut: string; dateFin: string | null;
  uniteTarif: UniteTarif;
  tarifClient: string;                // jamais envoyé au PROF
  tarifProf: string;                  // jamais envoyé au CLIENT
  statut: StatutAssignation;
  createdAt: string; updatedAt: string;
  demande?: Demande; professeur?: Professeur & { user: UserPublic }; creneaux?: Creneau[];
}

interface Creneau { id: number; assignationId: number; jourSemaine: JourSemaine; heureDebut: string; heureFin: string }

interface Seance {
  id: number; assignationId: number;
  dateSeance: string; heureDebut: string; heureFin: string;
  codeGenereLe: string | null;        // non null = le client a déjà affiché le code
  tentativesEchouees: number;         // 5 = validation bloquée
  statut: StatutSeance;
  dateValidation: string | null;
  motifAnnulation: string | null;
  createdAt: string; updatedAt: string;
  codeSecret?: string;                // UNIQUEMENT dans GET /client/seances/aujourdhui
  assignation?: Partial<Assignation>;
}

interface Paiement {
  id: number; assignationId: number;
  sens: SensPaiement; mois: number; annee: number;
  montant: string; mode: ModePaiement | null; reference: string | null;
  statut: StatutPaiement; commentaire: string | null;
  datePaiement: string | null;        // toujours rempli si statut = PAYE
  createdAt: string; updatedAt: string;
  assignation?: Partial<Assignation>;
}

interface Notification {
  id: number; userId: number; type: TypeNotification;
  titre: string; message: string | null;
  data: { demandeId?: number; assignationId?: number; seanceId?: number; paiementId?: number; statut?: string } | null;
  luLe: string | null;                // null = non lue
  createdAt: string;
}

interface Recap {
  periode: { annee: number; mois: number };
  uniteTarif: UniteTarif;
  seances: { prevues: number; effectuees: number; manquees: number; annulees: number; heuresEffectuees: number };
  moisComplet: boolean;               // mois terminé ET plus aucune séance PREVUE : le prof peut être payé
  client: { du: number; paye: number; enAttente: number; reste: number };
  prof:   { du: number; paye: number; enAttente: number; reste: number };
  marge: number;                      // du client - du prof
}
// Montants du récap : de vrais nombres (pas des chaînes).
// Calcul du "du" : SEANCE = nb séances EFFECTUEE x tarif ; HEURE = heures effectuées x tarif ; MOIS = forfait.
```

## 4. Erreurs

Toute erreur renvoie :

```ts
{ message: string; details?: { champ: string; message: string }[] | string }
```

| Statut | Cas | Exemple de `message` |
|---|---|---|
| 400 | Validation des entrées. `details[].champ` = chemin du champ, ex. `email`, `creneaux.0.heureFin` | `Donnees invalides` |
| 400 | Règle métier | `Code incorrect, encore 3 essai(s)` |
| 401 | Pas de token, token invalide ou expiré, mot de passe changé depuis : **déconnecter** | `Session invalide ou expiree` |
| 401 | Mauvais identifiants (login) | `Identifiants incorrects` |
| 403 | Mauvais rôle, compte suspendu, validation bloquée | `Acces refuse`, `Compte suspendu` |
| 404 | Ressource absente **ou qui n'appartient pas à l'utilisateur** | `Demande introuvable` |
| 409 | Doublon : `details[].champ` vaut `email`, `telephone`, `nom` ou `libelle` | `Cette valeur existe deja` + `details: [{ champ: 'email', message: 'Cet email est deja utilise' }]` |
| 409 | Conflit métier | `Le professeur a deja cours le lundi 16:00-18:00 (assignation #12)` |
| 429 | Trop de tentatives (routes publiques sensibles) | `Trop de tentatives, reessayez dans quelques minutes` |
| 500 | Erreur serveur | `Erreur interne du serveur` |

Les messages de l'API sont en français, mais **sans accents** (ex. `Donnees invalides`). Les afficher tels quels convient ; pour soigner l'interface, on peut les surcharger côté front sur les cas fréquents.

---

## 5. Public et authentification

### `GET /health` — public
`{ status: 'ok' }`

### `GET /referentiels` — public
Valeurs **actives** pour les formulaires.
```ts
{ villes: Ville[]; specialites: Specialite[]; niveaux: Niveau[] } // villes et matières triées par nom, niveaux par ordre
```

### `POST /auth/register` — public, limité
Crée un **client** et le connecte.
```ts
// entrée
{ nom: string; prenom: string; email: string; telephone: string; password: string; adresse?: string }
// sortie 201
{ token: string; user: User }
```
- `email` : converti en minuscules.
- `telephone` : espaces, points et tirets retirés, puis 8 à 15 chiffres avec `+` optionnel (ex. `+229 01 97 00 00 00` devient `+2290197000000`).
- `password` : 8 à 72 caractères.
- Erreur 409 si l'email ou le téléphone est déjà utilisé.

### `POST /auth/login` — public, limité
```ts
{ identifiant: string; password: string } // identifiant = email OU téléphone (dans n'importe quel format)
// 200
{ token: string; user: User }
```
- 401 `Identifiants incorrects` : compte inconnu, mauvais mot de passe, ou prof qui n'a pas encore activé son compte.
- 403 `Compte suspendu`.

### `GET /auth/me`
`User` (avec son `client` ou son `professeur` et ses référentiels).

### `POST /auth/password/change`
```ts
{ currentPassword: string; newPassword: string }
// 200 : { token, user }
```
**Remplacer le token stocké** : l'ancien token est invalidé. Erreur 400 `Mot de passe actuel incorrect`.

### `POST /auth/password/forgot` — public, limité — **EN ATTENTE, ne pas utiliser**
Cette fonctionnalité dépend de l'envoi d'emails, désactivé pour l'instant : la route existe, mais aucun email ne part. Documentée pour plus tard.
`{ email }` donne toujours 200 `{ message }`, que le compte existe ou non. Un lien `FRONT_URL/reset-password?token=...` part par email.

### `POST /auth/password/reset` — public, limité — **EN ATTENTE, ne pas utiliser**
`{ token, password }` donne 200 `{ message }`. 400 `Lien invalide ou expire` (lien valable 1 h, à usage unique). Rediriger ensuite vers `/connexion`.

### `POST /auth/invitation/accept` — public, limité
Activation d'un compte prof depuis `FRONT_URL/invitation?token=...`.
```ts
{ token: string; password: string }
// 200 : { token, user } (le prof est connecté directement)
```
400 `Lien invalide ou expire` : lien valable 7 jours, à usage unique, invalidé si l'admin en a généré un nouveau.

### Notifications (tous rôles connectés)

| Route | Entrée | Sortie |
|---|---|---|
| `GET /notifications?nonLues=true&page=&limit=` | `nonLues` optionnel (`true` ou `false`) | *paginée* `{ data: Notification[], total, page, limit, nonLues: number }`, plus récentes d'abord. `nonLues` = total non lu (pour la pastille de la cloche) |
| `POST /notifications/:id/lire` | — | `Notification` |
| `POST /notifications/lire-tout` | — | `{ marquees: number }` |

---

## 6. Client — rôle `CLIENT`

### `POST /client/demandes`
```ts
{
  villeId: number; niveauId: number; specialiteIds: number[];  // au moins 1, ids actifs de /referentiels
  typeBeneficiaire: 'ENFANT' | 'SOI_MEME';
  description: string;                 // 10 à 5000 caractères
  quartier?: string | null;            // max 120
  budget?: number | null;              // >= 0, en FCFA
  joursSouhaites?: JourSouhaite[] | null;
  caracteristiquesProf?: string | null; // max 2000
}
// 201 : Demande (+ assignations: [])
```
400 avec `details: [{ champ: 'villeId', message: 'Inexistants ou desactives : 7' }]` si un id n'est pas actif. Les admins sont notifiés.

### `GET /client/demandes?statut=&page=&limit=` — *paginée*
`Demande[]` (avec ville, niveau, spécialités), plus récentes d'abord. Sans `noteAdmin` ni `traiteePar`.

### `GET /client/demandes/:id`
`Demande` avec en plus :
```ts
assignations: Array<{
  id; statut; dateDebut; dateFin; uniteTarif; tarifClient;
  professeur: Professeur & { user: UserPublic };  // le client voit le nom et le téléphone du prof
  creneaux: Creneau[];
}> // plus récente d'abord ; celle avec statut ACTIVE est la mission en cours
```

### `POST /client/demandes/:id/annuler`
Possible seulement si la demande est `EN_ATTENTE` ou `EN_RECHERCHE` ; sinon 409. Renvoie la `Demande` à jour.

### `GET /client/seances?annee=2026&mois=11&assignationId=`
`annee` et `mois` sont **obligatoires**. Séances du mois de toutes ses assignations, triées par date puis heure :
```ts
Seance & { assignation: { id; statut; demandeId; professeurId; professeur: Professeur & { user: UserPublic } } }
```

### `GET /client/seances/aujourdhui`
Séances `PREVUE` du jour, sur des assignations `ACTIVE`, **avec `codeSecret`**. Appeler cette route **génère** le code s'il n'existe pas encore ; les appels suivants renvoient le même code.
```ts
Array<Seance & { codeSecret: string; assignation: {...comme ci-dessus} }>
```
Une séance validée disparaît de cette liste (elle n'est plus `PREVUE`).

### `GET /client/paiements?page=&limit=` — *paginée*
Paiements `CLIENT_VERS_ADMIN` du client : `Paiement & { assignation: {..., professeur: {..., user}} }`.

---

## 7. Professeur — rôle `PROFESSEUR`

### `GET /prof/assignations?statut=`
Sans `statut` : toutes **sauf** `TERMINEE`. Pas de pagination.
```ts
Array<{
  id; demandeId; statut; dateDebut; dateFin; uniteTarif; tarifProf;  // pas de tarifClient
  demande: Demande sans budget, noteAdmin ni traiteePar, & { client: Client & { user: UserPublic } }; // adresse et téléphone du client
  creneaux: Creneau[];  // triés par jour puis heure
}>
```

### `GET /prof/seances?annee=&mois=&assignationId=`
`annee` et `mois` sont **obligatoires**.
```ts
Seance & { assignation: { id; statut; demandeId; demande: {...comme ci-dessus} } }
```
Jamais de `codeSecret`. `codeGenereLe !== null` signifie que le client a affiché le code et que le prof peut le saisir.

### `POST /prof/seances/:id/valider`
```ts
{ code: string } // exactement 6 chiffres
// 200 : Seance (statut EFFECTUEE)
```

| Statut | `message` | Quoi afficher |
|---|---|---|
| 400 | `La validation n'est possible que le jour de la seance` | — |
| 400 | `Le client n'a pas encore affiche le code du jour` | Inviter le prof à demander au client d'ouvrir son appli |
| 400 | `Code incorrect, encore N essai(s)` | Afficher N |
| 403 | `Code incorrect : validation bloquee, l'administrateur a ete prevenu` | 5e erreur |
| 403 | `Trop d'essais : validation bloquee, contactez l'administrateur` | Tentative alors que c'est déjà bloqué |
| 409 | `Cette seance est deja effectuee` (ou `manquee`, `annulee`), `L'assignation n'est pas active` | — |
| 404 | `Seance introuvable` | Pas une séance de ce prof |

### `GET /prof/paiements?page=&limit=` — *paginée*
Paiements `ADMIN_VERS_PROF` reçus : `Paiement & { assignation: { id, demandeId } }`.

---

## 8. Admin — rôle `ADMIN`

### Référentiels

| Route | Entrée | Sortie |
|---|---|---|
| `GET /admin/villes` | — | `Ville[]`, **actives et inactives** |
| `POST /admin/villes` | `{ nom }` | 201 `Ville` (409 si doublon) |
| `PATCH /admin/villes/:id` | `{ nom?, estActive? }` | `Ville` |
| `GET /admin/specialites` | — | `Specialite[]` |
| `POST /admin/specialites` | `{ libelle }` | 201 |
| `PATCH /admin/specialites/:id` | `{ libelle?, estActive? }` | `Specialite` |
| `GET /admin/niveaux` | — | `Niveau[]` (par `ordre`) |
| `POST /admin/niveaux` | `{ libelle, ordre }` (ordre 0 à 65535) | 201 |
| `PATCH /admin/niveaux/:id` | `{ libelle?, ordre?, estActive? }` | `Niveau` |

Pas de suppression : on désactive avec `estActive: false`. Un élément inactif n'apparaît plus dans `/referentiels` et ne peut plus être choisi, mais l'historique reste intact.

### Demandes

#### `GET /admin/demandes?statut=&villeId=&page=&limit=` — *paginée*
`Demande` (avec `noteAdmin`) + ville, niveau, spécialités et `client: { userId, adresse, user }`. Plus récentes d'abord.

#### `GET /admin/demandes/:id`
Comme ci-dessus, avec en plus `admin: UserPublic | null` (l'admin qui l'a traitée) et `assignations: Assignation[]`, chacune avec `professeur.user` et `creneaux`, la plus récente d'abord.

#### `PATCH /admin/demandes/:id`
```ts
{ statut?: 'EN_ATTENTE' | 'EN_RECHERCHE' | 'REJETEE'; noteAdmin?: string | null }
// 200 : Demande (sans relations)
```
`ASSIGNEE` est posé automatiquement à la création d'une assignation. Une demande `ASSIGNEE` ou `ANNULEE` ne change pas de statut ici (409), mais sa note reste modifiable. Le client est notifié du changement de statut.

#### `GET /admin/demandes/:id/professeurs-compatibles`
Profs `DISPONIBLE`, au compte `ACTIF`, qui couvrent **la ville et le niveau** de la demande et **au moins une** de ses matières. Triés par matières couvertes (décroissant), puis par charge (croissant).
```ts
Array<Professeur & {
  user: UserPublic;
  villes: Ville[]; niveaux: Niveau[];  // filtrées sur celles de la demande
  specialites: Specialite[];           // uniquement celles de la demande que le prof couvre
  specialitesCouvertes: number;
  couvreTout: boolean;                 // couvre toutes les matières demandées
  assignationsActives: number;         // charge actuelle
}>
```

### Professeurs

#### `GET /admin/professeurs?q=&disponibilite=&villeId=&specialiteId=&niveauId=&page=&limit=` — *paginée*
`q` cherche dans nom, prénom, email et téléphone. Tri par nom puis prénom.
```ts
Professeur & { user: UserPublic & { compteActive: 0 | 1 }; specialites; villes; niveaux }
```
`compteActive = 0` : le prof n'a pas encore utilisé son invitation. Afficher « Invitation en attente » et un bouton « Renvoyer l'invitation ».

#### `POST /admin/professeurs`
```ts
{ nom; prenom; email; telephone; bio?: string; specialiteIds: number[]; villeIds: number[]; niveauIds: number[] } // listes non vides
// 201
{
  professeur: User;   // ATTENTION : c'est un User (role PROFESSEUR), le profil est dans professeur.professeur
  invitation: { lien: string; expireLe: string; message: string }; // message = texte prêt à coller dans WhatsApp, lien compris
}
```
**Aucun email n'est envoyé** : c'est l'admin qui transmet le lien au prof. Afficher le lien et le message avec les boutons « Copier le message », « Copier le lien » et « Envoyer sur WhatsApp » (`https://wa.me/<numéro international sans +>?text=${encodeURIComponent(message)}`).

#### `GET /admin/professeurs/:id`
`Professeur` + `user` (avec `compteActive`) + référentiels + `assignations[]`, chacune avec sa `demande` complète (client et user) et ses `creneaux`, plus récentes d'abord.

#### `PATCH /admin/professeurs/:id`
```ts
{ nom?; prenom?; email?; telephone?; bio?: string | null; disponibilite?: Disponibilite;
  specialiteIds?: number[]; villeIds?: number[]; niveauIds?: number[] } // une liste envoyée REMPLACE l'existante
// 200 : User (avec professeur et référentiels)
```

#### `POST /admin/professeurs/:id/invitation`
200 `{ invitation: { lien, expireLe, message } }`. Génère un **nouveau** lien : l'ancien devient invalide. Sert si le prof a perdu le lien ou s'il a expiré (7 jours). 409 si le compte est déjà activé.

### Clients et comptes

| Route | Sortie |
|---|---|
| `GET /admin/clients?q=&page=&limit=` (*paginée*) | `UserPublic & { createdAt; client: Client }`, plus récents d'abord |
| `GET /admin/clients/:id` | idem + `client.demandes: Demande[]` (avec ville, niveau, spécialités) |
| `PATCH /admin/users/:id/statut` avec `{ statut: 'ACTIF' \| 'SUSPENDU' }` | `User`. Effet **immédiat** : un compte suspendu est bloqué dès sa requête suivante. Impossible sur soi-même ou sur un admin |

### Assignations

Toutes les routes ci-dessous (sauf la liste) renvoient une **assignation complète** :
```ts
Assignation & {
  demande: Demande & { client: Client & { user: UserPublic } };
  professeur: Professeur & { user: UserPublic };
  creneaux: Creneau[];  // triés par jour puis heure
}
```

#### `POST /admin/assignations`
```ts
{
  demandeId: number; professeurId: number;
  dateDebut: string; dateFin?: string | null;   // AAAA-MM-JJ, fin >= début
  uniteTarif: UniteTarif;
  tarifClient: number; tarifProf: number;        // >= 0
  creneaux: Array<{ jourSemaine: 1-7; heureDebut: 'HH:MM'; heureFin: 'HH:MM' }>; // 1 à 21, fin > début
}
// 201 : assignation complète
```
Effets : séances générées du jour même jusqu'à la fin du mois suivant, demande passée en `ASSIGNEE`, client et prof notifiés.

Erreurs à afficher clairement :

| Statut | Cas |
|---|---|
| 400 | Créneaux qui se chevauchent dans le planning saisi (`Creneaux qui se chevauchent : lundi 08:00-10:00 et lundi 09:00-11:00`) |
| 409 | La demande a déjà une assignation active (`... : terminez-la d'abord`) |
| 409 | Demande annulée ou rejetée |
| 409 | Prof suspendu ou indisponible |
| 409 | **Conflit horaire** avec une autre assignation active du prof (`Le professeur a deja cours le ...`) |

#### `GET /admin/assignations?statut=&professeurId=&demandeId=&page=&limit=` — *paginée*
`Assignation & { demande (avec client.user), professeur (avec user) }`, **sans** `creneaux`.

#### `GET /admin/assignations/:id`
Assignation complète, avec en plus `paiements: Paiement[]`.

#### `PATCH /admin/assignations/:id`
`{ dateFin?: string | null; uniteTarif?; tarifClient?; tarifProf? }`. Raccourcir `dateFin` supprime les séances prévues après la nouvelle date ; la prolonger en génère. 409 si l'assignation est `TERMINEE`.

#### `PATCH /admin/assignations/:id/statut`
```ts
{ statut: 'ACTIVE' | 'SUSPENDUE' | 'TERMINEE'; relancerDemande?: boolean }
```

| Passage | Effet |
|---|---|
| vers `SUSPENDUE` | Séances `PREVUE` à partir d'aujourd'hui passées en `ANNULEE` (motif `Assignation suspendue`) |
| `SUSPENDUE` vers `ACTIVE` | Ces séances reviennent en `PREVUE`. Refusé (409) en cas de conflit horaire ou si la demande a entre-temps une autre assignation active |
| vers `TERMINEE` | Définitif. `dateFin` ramenée à aujourd'hui, séances futures annulées. Avec `relancerDemande: true`, la demande repasse en `EN_RECHERCHE` (pour assigner un autre prof) |

#### `PUT /admin/assignations/:id/creneaux`
`{ creneaux: [...] }` remplace tout le planning. Les séances futures non commencées sont recréées. Mêmes contrôles de chevauchement et de conflit que la création.

#### `POST /admin/assignations/:id/seances`
`{ annee, mois }` planifie un mois plus lointain (le mois courant et le suivant sont automatiques). Renvoie `{ seancesPlanifiees: number }`. Pas de doublon si on relance.

#### `GET /admin/assignations/:id/recap?annee=&mois=`
Renvoie un `Recap` (section 3).

### Séances

#### `GET /admin/seances?annee=&mois=&assignationId=`
`annee` et `mois` sont obligatoires.
```ts
Seance & { assignation: { id; statut; demandeId; professeurId; professeur: {..., user} } }
```

#### `PATCH /admin/seances/:id`
```ts
{ statut?: StatutSeance; motifAnnulation?: string; debloquer?: boolean }
```
- `ANNULEE` exige `motifAnnulation`.
- `EFFECTUEE` remplit `dateValidation`.
- `debloquer: true` remet `tentativesEchouees` à 0.

Renvoie la `Seance`.

### Paiements

#### `GET /admin/paiements?assignationId=&sens=&statut=&annee=&mois=&page=&limit=` — *paginée*
```ts
Paiement & { assignation: { id; demandeId; professeurId; uniteTarif; tarifClient; tarifProf;
  professeur: {..., user}; demande: { id; client: {..., user} } } }
```

#### `POST /admin/paiements`
```ts
{
  assignationId: number; sens: SensPaiement; annee: number; mois: number;  // période concernée
  montant: number;                    // > 0 ; plusieurs paiements par mois possibles (tranches)
  statut?: StatutPaiement;            // défaut PAYE
  mode?: ModePaiement | null; reference?: string | null; commentaire?: string | null;
  datePaiement?: string | null;       // défaut : maintenant si PAYE
}
// 201 : Paiement. Le destinataire est notifié si PAYE.
```

#### `PATCH /admin/paiements/:id`
Mêmes champs que la création, sauf `assignationId`, `sens` et la période. Passer à `PAYE` remplit `datePaiement` et notifie le destinataire ; repasser à `EN_ATTENTE` la vide.

#### `DELETE /admin/paiements/:id`
204, sans contenu.
