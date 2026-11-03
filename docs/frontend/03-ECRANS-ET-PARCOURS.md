# AlloProf — Écrans et parcours

> Document 3/3. Pour chaque écran : à quoi il sert, quelles routes il appelle (détail dans `02-API.md`) et les règles d'interface.
> Les routes d'API sont notées sans le préfixe `/api`.

## 1. Libellés et couleurs (`lib/labels.ts`)

Ne jamais afficher une valeur brute d'enum. Badge = composant `Badge` de shadcn, avec la couleur indiquée.

### Statut d'une demande

| Valeur | Libellé | Couleur |
|---|---|---|
| `EN_ATTENTE` | En attente | gris |
| `EN_RECHERCHE` | Recherche en cours | bleu |
| `ASSIGNEE` | Professeur trouvé | vert |
| `ANNULEE` | Annulée | gris clair, barré |
| `REJETEE` | Refusée | rouge |

### Statut d'une assignation

| Valeur | Libellé | Couleur |
|---|---|---|
| `ACTIVE` | En cours | vert |
| `SUSPENDUE` | Suspendue | orange |
| `TERMINEE` | Terminée | gris |

### Statut d'une séance

| Valeur | Libellé | Couleur |
|---|---|---|
| `PREVUE` | Prévue | bleu |
| `EFFECTUEE` | Effectuée | vert |
| `MANQUEE` | Manquée | rouge |
| `ANNULEE` | Annulée | gris |

Une séance `PREVUE` avec `tentativesEchouees >= 5` s'affiche en plus avec un badge orange **Bloquée**.

### Paiements

| Champ | Valeur | Libellé |
|---|---|---|
| Statut | `PAYE` | Payé (vert) |
| Statut | `EN_ATTENTE` | En attente (orange) |
| Sens | `CLIENT_VERS_ADMIN` | Reçu du client |
| Sens | `ADMIN_VERS_PROF` | Versé au prof |
| Mode | `MOBILE_MONEY` | Mobile Money |
| Mode | `ESPECES` | Espèces |
| Mode | `VIREMENT` | Virement |

### Autres libellés

| Champ | Valeur | Libellé |
|---|---|---|
| Unité de tarif | `SEANCE` | par séance |
| Unité de tarif | `HEURE` | par heure |
| Unité de tarif | `MOIS` | par mois (forfait) |
| Bénéficiaire | `ENFANT` | Pour mon enfant |
| Bénéficiaire | `SOI_MEME` | Pour moi-même |
| Disponibilité | `DISPONIBLE` | Disponible (vert) |
| Disponibilité | `INDISPONIBLE` | Indisponible (gris) |
| Statut du compte | `ACTIF` | Actif |
| Statut du compte | `SUSPENDU` | Suspendu (rouge) |

### Jours

- `jourSemaine` : 1 Lundi, 2 Mardi, 3 Mercredi, 4 Jeudi, 5 Vendredi, 6 Samedi, 7 Dimanche.
- `joursSouhaites` : `LUNDI` à `DIMANCHE`, à afficher avec une majuscule initiale.

### Notifications (icône et lien au clic)

| Type | Lien |
|---|---|
| `NOUVELLE_DEMANDE`, `DEMANDE_ANNULEE` | `/admin/demandes/{data.demandeId}` |
| `SEANCE_BLOQUEE` | `/admin/assignations/{data.assignationId}` (onglet séances) |
| `DEMANDE_STATUT` | `/client/demandes/{data.demandeId}` |
| `NOUVELLE_ASSIGNATION`, `ASSIGNATION_STATUT`, `PLANNING_MODIFIE` | Client : `/client/demandes/{data.demandeId}`. Prof : `/prof/missions` |
| `SEANCE_VALIDEE` | `/client/calendrier` |
| `PAIEMENT_ENREGISTRE` | `/client/paiements` |
| `PAIEMENT_RECU` | `/prof/paiements` |

Cliquer sur une notification la marque comme lue (`POST /notifications/:id/lire`), puis navigue vers le lien.

## 2. Éléments communs

- **Cloche de notifications** dans l'en-tête des trois espaces : pastille = `nonLues` de `GET /notifications?limit=1` (rafraîchir toutes les 60 s avec `refetchInterval`). Au clic, un panneau ou une page liste les notifications, avec un bouton « Tout marquer comme lu ».
- **Menu du compte** : nom de l'utilisateur, lien « Mon compte » (`/compte`), « Se déconnecter » (vider le token et rediriger vers `/connexion`).
- **`/compte`** : affiche nom, email et téléphone (lecture seule pour l'instant). Le formulaire « Changer mon mot de passe » appelle `POST /auth/password/change` puis **remplace le token stocké** par celui de la réponse.
- **`StatutBadge`** : un seul composant pour tous les enums de la section 1.
- **`CalendrierMois`** : composant partagé client, prof et admin. Grille du mois (lundi en première colonne), sélecteur mois précédent / suivant (met à jour `annee` et `mois`), séances en pastilles colorées par statut. Au clic sur un jour, le détail des séances s'affiche. Sur mobile, proposer aussi une vue **liste** par jour, plus lisible.

## 3. Pages publiques

### `/` — Accueil
- Présentation en trois étapes :
  1. « Décrivez votre besoin » ;
  2. « Nous trouvons le professeur » ;
  3. « Suivez chaque cours avec un code de présence ».
- Afficher les villes couvertes (`GET /referentiels`) et deux boutons : « Trouver un professeur » (vers `/inscription`) et « Se connecter ».
- Rendu serveur pour le référencement.

### `/inscription`
- Champs : nom, prénom, email, téléphone, mot de passe, adresse (optionnelle).
- Appelle `POST /auth/register`, stocke la session puis redirige vers `/client/demandes/nouvelle` : le but de l'inscription est de faire une demande.
- Pas d'inscription prof (voir le brief).

### `/connexion`
- Champ unique « Email ou téléphone » et mot de passe. Appelle `POST /auth/login`, puis redirige selon le rôle (ou vers `?next=`).
- Pas de lien « Mot de passe oublié ? » pour l'instant (fonctionnalité en attente) : afficher à la place « Mot de passe oublié ? Contactez AlloProf. »
- Sur un 401, afficher « Email/téléphone ou mot de passe incorrect ».

### Mot de passe oublié — EN ATTENTE, ne pas construire
Dépend de l'envoi d'emails, désactivé pour l'instant. Pour plus tard : pages `/mot-de-passe-oublie` (`POST /auth/password/forgot`) et `/reset-password?token=` (`POST /auth/password/reset`).

### `/invitation?token=` — Activation du compte prof
- Message « Bienvenue sur AlloProf, choisissez votre mot de passe », champs mot de passe et confirmation.
- Appelle `POST /auth/invitation/accept`, stocke la session puis redirige vers `/prof`.
- Sur un 400 : « Ce lien n'est plus valide, demandez-en un nouveau à l'administrateur. »

## 4. Espace client (mobile-first)

Barre de navigation en bas : **Accueil**, **Demandes**, **Calendrier**, **Paiements**.

### `/client` — Accueil

**1. En haut : « Mes cours aujourd'hui »** (`GET /client/seances/aujourdhui`). C'est l'écran le plus important du client.
- Pour chaque séance du jour, une carte avec le nom du prof, l'horaire et le **code à 6 chiffres en très grand** (police mono, chiffres espacés : `482 913`).
- Texte d'aide : « Donnez ce code à votre professeur au début du cours ».
- Boutons « Copier » et « Envoyer par WhatsApp » au téléphone du prof (`https://wa.me/<tel sans +>?text=Code AlloProf du jour : 482913`).
- **N'appeler cette route que sur cette page**, à l'ouverture : l'appel génère le code.
- Rafraîchir quand la fenêtre reprend le focus. Une séance validée disparaît de la liste ; afficher alors un message « Cours validé ✓ » à partir des notifications `SEANCE_VALIDEE`, ou simplement l'état vide.
- État vide : « Pas de cours aujourd'hui ».

**2. Ensuite** : les demandes en cours (3 dernières, depuis `GET /client/demandes?limit=3`) avec leur badge, et un bouton « Nouvelle demande ».

### `/client/demandes/nouvelle` — Formulaire de demande

Les référentiels viennent de `GET /referentiels`. Le formulaire peut être en plusieurs étapes sur mobile :

1. **Pour qui ?** : `typeBeneficiaire`, à choisir entre deux grosses cartes.
2. **Où ?** : ville (liste), quartier (texte).
3. **Quoi ?** : niveau (liste triée par `ordre`), matières (choix multiple en puces, au moins une).
4. **Détails** :
   - `description` (zone de texte, au moins 10 caractères, placeholder « Ex : mon fils est en 3e, il a des difficultés en maths, surtout en géométrie ») ;
   - jours souhaités (puces Lun à Dim) ;
   - budget mensuel en FCFA (optionnel) ;
   - attentes sur le prof (optionnel, ex. « une femme », « expérience du BEPC »).
5. **Récapitulatif**, puis « Envoyer ma demande » : `POST /client/demandes`, puis redirection vers le détail avec le toast « Demande envoyée, nous vous recontactons rapidement ».

### `/client/demandes` — Liste
Cartes (`GET /client/demandes`, paginée, filtre par statut en onglets) : matières, niveau, ville, date, badge de statut.

### `/client/demandes/[id]` — Détail
- Résumé de la demande et badge de statut.
- **Frise d'avancement** : Envoyée, puis Recherche en cours, puis Professeur trouvé (cas `ANNULEE` et `REJETEE` à part).
- Si une assignation `ACTIVE` existe (`assignations[0]` avec `statut === 'ACTIVE'`), une carte **« Votre professeur »** affiche :
  - le nom du prof, son téléphone (bouton appeler `tel:` et bouton WhatsApp) ;
  - le planning hebdo (« Lundi 16h00 – 18h00 ») ;
  - le tarif (`tarifClient` et unité) et la date de début.
- Bouton « Annuler la demande » visible seulement si le statut est `EN_ATTENTE` ou `EN_RECHERCHE`, avec une boîte de confirmation, puis `POST /client/demandes/:id/annuler`.

### `/client/calendrier`
`CalendrierMois` sur `GET /client/seances?annee&mois`. Au clic sur une séance : prof, horaire, statut, et le motif si elle est annulée.

### `/client/paiements`
Liste (`GET /client/paiements`) : mois concerné (`11/2026`), montant, mode, référence, badge de statut, date.

## 5. Espace prof (mobile-first)

Barre de navigation en bas : **Aujourd'hui**, **Calendrier**, **Missions**, **Paiements**.

### `/prof` — Aujourd'hui (l'écran le plus important du prof)

1. Charger `GET /prof/seances?annee&mois` du mois courant et filtrer `dateSeance === aujourd'hui` (date locale au format `AAAA-MM-JJ`).
2. Pour chaque séance du jour, une carte avec l'horaire, le client (nom, quartier, adresse, bouton appeler) et les matières. Selon l'état :
   - **`PREVUE`** : un champ **« Code du client »**, 6 cases (OTP input de shadcn, clavier numérique `inputMode="numeric"`), et un bouton « Valider ma présence » qui appelle `POST /prof/seances/:id/valider`.
     - En cas de succès : la carte passe en vert « Présence validée ✓ ».
     - En cas d'erreur : afficher le message de l'API ; pour « encore N essai(s) », afficher N en évidence.
     - Si `codeGenereLe === null`, afficher en plus : « Le client n'a pas encore ouvert son code, demandez-lui d'ouvrir l'application AlloProf ».
   - **`PREVUE` bloquée** (`tentativesEchouees >= 5`) : désactiver la saisie et afficher « Validation bloquée, l'administrateur a été prévenu ».
   - **`EFFECTUEE`** : vert, heure de validation.
   - **`ANNULEE`** : gris avec le motif.
3. Sous les cartes : « Prochains cours », soit les 3 prochaines séances `PREVUE` après aujourd'hui.
4. État vide : « Pas de cours aujourd'hui ».

### `/prof/calendrier`
`CalendrierMois` sur `GET /prof/seances`. Le compteur du mois (effectuées, prévues, manquées) motive le prof : son paiement en dépend.

### `/prof/missions`
`GET /prof/assignations`. Une carte par mission, avec :
- le client : nom, téléphone, quartier, adresse ;
- le niveau, les matières, la description de la demande et les attentes ;
- le planning hebdo ;
- le tarif prof (`tarifProf` et unité), la date de début, le badge de statut.

Le prof ne voit **ni le budget du client ni le tarif client** : l'API ne les envoie pas, ne pas chercher à les afficher.

### `/prof/paiements`
`GET /prof/paiements` : mois, montant, mode, statut, date.

## 6. Back-office admin (desktop-first)

Sidebar : **Tableau de bord**, **Demandes**, **Assignations**, **Professeurs**, **Clients**, **Paiements**, **Référentiels**.

### `/admin` — Tableau de bord
- Compteurs cliquables :
  - demandes `EN_ATTENTE` (`GET /admin/demandes?statut=EN_ATTENTE&limit=1`, lire `total`) ;
  - demandes `EN_RECHERCHE` ;
  - assignations `ACTIVE` ;
  - profs avec invitation en attente.
- Les dernières notifications (nouvelles demandes, séances bloquées), avec un lien direct.

### `/admin/demandes` — Liste
- Tableau (`GET /admin/demandes`) : date, client (nom et téléphone), ville, niveau, matières, budget, badge de statut.
- Filtres : statut (onglets, `EN_ATTENTE` par défaut) et ville. Clic sur une ligne pour ouvrir le détail.

### `/admin/demandes/[id]` — Détail (écran clé)
Deux colonnes.

**Colonne gauche : la demande.**
- Toutes les infos, y compris le budget et les attentes.
- Le client, avec téléphone et WhatsApp (l'admin le rappelle pour qualifier le besoin).
- Les actions de statut : « Passer en recherche » (`EN_RECHERCHE`), « Refuser » (`REJETEE`, avec une confirmation).
- La **note interne** : zone de texte enregistrée avec `PATCH /admin/demandes/:id { noteAdmin }`.
- L'historique des assignations de la demande.

**Colonne droite : « Professeurs compatibles ».** `GET /admin/demandes/:id/professeurs-compatibles`.
- Une carte par prof : nom, téléphone, matières couvertes (badge « Couvre tout » si `couvreTout`), nombre de missions en cours (`assignationsActives`).
- Bouton « **Assigner** » qui mène vers `/admin/assignations/nouvelle?demandeId=X&professeurId=Y`.
- Si la liste est vide : « Aucun professeur compatible », avec un bouton « Créer un professeur » qui pré-remplit ville, niveau et matières de la demande.
- Si la demande a déjà une assignation `ACTIVE` : remplacer la colonne par la carte de l'assignation en cours (lien vers son détail).

### `/admin/professeurs` — Liste
- Tableau (`GET /admin/professeurs`) : nom, téléphone, matières, villes, niveaux, disponibilité, badge « Invitation en attente » si `user.compteActive === 0`.
- Filtres : recherche (`q`, avec un délai de 300 ms), ville, matière, niveau, disponibilité.
- Bouton « Nouveau professeur ».

### `/admin/professeurs/nouveau`
- Formulaire : nom, prénom, email, téléphone, bio, et choix multiples pour matières, villes et niveaux (au moins un de chaque). Accepte un pré-remplissage par paramètres d'URL.
- Appelle `POST /admin/professeurs`. En cas de succès, une boîte de dialogue « **Invitation créée** » affiche :
  - l'instruction « Envoyez ce message au professeur sur WhatsApp : c'est grâce à lui qu'il activera son compte » (aucun email n'est envoyé) ;
  - le message prêt à envoyer (`invitation.message`, qui contient le lien) dans une zone de texte en lecture seule ;
  - les boutons « **Copier le message** », « Copier le lien » (`invitation.lien`) et « **Envoyer sur WhatsApp** » (ouvre `https://wa.me/<numéro>?text=<message encodé>` avec le téléphone du prof) ;
  - la date d'expiration (« Lien valable jusqu'au … »).

### `/admin/professeurs/[id]`
- Fiche du prof (`GET /admin/professeurs/:id`), modifiable (`PATCH`) : infos, bio, interrupteur de disponibilité, référentiels.
- « Générer un nouveau lien d'invitation », si `compteActive === 0` (le prof a perdu le lien ou il a expiré), ouvre la même boîte de dialogue que ci-dessus.
- « Suspendre le compte » ou « Réactiver » via `PATCH /admin/users/:id/statut`.
- La liste de ses assignations, avec un lien vers chacune.

### `/admin/clients` et `/admin/clients/[id]`
- Liste avec recherche (`GET /admin/clients`).
- La fiche du client montre ses demandes, et un bouton « Suspendre » ou « Réactiver ».

### `/admin/assignations/nouvelle?demandeId=&professeurId=` — Création (écran clé)
- En haut, un rappel de la demande (client, matières, jours souhaités, budget) et du prof choisi. Les deux sont modifiables : liste des demandes non assignées, liste des profs compatibles.

**Formulaire :**
- `dateDebut` (par défaut aujourd'hui), `dateFin` (optionnelle, « sans date de fin » par défaut).
- `uniteTarif` (choix segmenté : par séance, par heure, par mois).
- `tarifClient` et `tarifProf` en FCFA, avec la **marge affichée en direct** (`tarifClient - tarifProf`, en rouge si négative).

**Composant `CreneauxEditor`** : une liste de lignes, chacune avec un jour (liste Lun à Dim), une heure de début et une heure de fin (`<input type="time">`).
- Boutons « + Ajouter un créneau » et 🗑 pour supprimer une ligne.
- Pré-remplir avec les `joursSouhaites` de la demande s'il y en a.
- Vérification locale : fin après début, et pas de chevauchement le même jour (c'est seulement un confort, l'API revérifie).
- Afficher un aperçu : « 2 séances par semaine, soit environ 9 séances en novembre ».

**Envoi :** `POST /admin/assignations`.
- En cas de succès, redirection vers `/admin/assignations/[id]`.
- Sur un **409 de conflit horaire**, afficher le message de l'API près de l'éditeur de créneaux, avec un lien vers l'assignation en conflit (`#id` dans le message).

### `/admin/assignations` — Liste
Tableau (`GET /admin/assignations`) : client, prof, matières, période, tarifs et unité, badge de statut. Filtres : statut, prof.

### `/admin/assignations/[id]` — Détail
En-tête : client, prof, demande (liens), badge de statut et les actions de statut :
- « Suspendre », puis « Réactiver » (`PATCH .../statut`) ;
- « Terminer » : boîte de dialogue avec la case « Remettre la demande en recherche (changer de professeur) », qui envoie `relancerDemande`.

Les boutons s'adaptent au statut ; une assignation `TERMINEE` est en lecture seule.

**Onglet Planning.**
- Les créneaux, et un bouton « Modifier le planning » qui ouvre le `CreneauxEditor` puis appelle `PUT .../creneaux`.
- Tarifs et date de fin modifiables (`PATCH /admin/assignations/:id`).
- « Planifier un autre mois » (`POST .../seances`).

**Onglet Séances.**
- `CalendrierMois` sur `GET /admin/seances?annee&mois&assignationId`.
- Au clic sur une séance, un panneau propose :
  - forcer « Effectuée » (litige) ;
  - « Annuler » (motif obligatoire) ;
  - « Remettre en prévue » ;
  - « Débloquer » si bloquée.

  Tout passe par `PATCH /admin/seances/:id`.

**Onglet Récap et paiements.**
- Sélecteur de mois, puis `GET .../recap?annee&mois`. Deux cartes :
  - **Client** : dû, payé, en attente, reste ;
  - **Prof** : dû, payé, en attente, reste.
- Plus la marge, les compteurs de séances et un badge « Mois complet, le prof peut être payé » si `moisComplet`.
- Boutons :
  - « Enregistrer un paiement client », qui pré-remplit `sens: CLIENT_VERS_ADMIN`, la période et `montant = client.reste` ;
  - « Payer le prof », qui pré-remplit `sens: ADMIN_VERS_PROF` et `montant = prof.reste`, et affiche un avertissement si `!moisComplet`.
- Liste des paiements de l'assignation (`paiements` de `GET /admin/assignations/:id`), avec modification et suppression.
- Après chaque paiement, invalider le récap.

### `/admin/paiements`
- Tableau global (`GET /admin/paiements`) : période, sens, client ou prof, montant, mode, référence, statut.
- Filtres : sens, statut, mois et année.
- Action rapide « Marquer payé » sur les paiements en attente (`PATCH { statut: 'PAYE' }`).

### `/admin/referentiels`
- Trois onglets : Villes, Matières, Niveaux.
- Pour chaque onglet, un tableau avec la colonne « Active » (interrupteur, `PATCH { estActive }`), une modification en ligne du nom, et un bouton « Ajouter ».
- Pour les niveaux, l'`ordre` est modifiable : il sert au tri.
- Pas de bouton supprimer. Ajouter une infobulle « Désactiver masque l'élément des nouveaux formulaires sans toucher à l'historique ».

## 7. Parcours de recette (à dérouler à la fin de l'étape 4 du brief)

1. Inscription d'un client, puis nouvelle demande (Cotonou, 3e, Maths + Physique-Chimie).
2. Admin : la demande apparaît, avec une notification. Passer en recherche, puis « Créer un professeur » (pré-rempli) et copier le lien d'invitation.
3. Ouvrir le lien en navigation privée, puis le prof choisit son mot de passe et arrive sur `/prof`.
4. Admin : revenir sur la demande. Le prof apparaît dans les compatibles : « Assigner » avec un créneau **aujourd'hui**, à une heure à venir.
5. Client : sur `/client`, le code du jour s'affiche.
6. Prof : saisir un faux code (« encore 4 essais »), puis le bon. La séance passe en vert, et le client reçoit la notification « Séance validée ».
7. Admin : le récap du mois de l'assignation montre 1 séance effectuée et les montants dus. Enregistrer un paiement client, que le client voit ensuite dans `/client/paiements`.
