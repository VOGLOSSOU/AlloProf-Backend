# AlloProf - Modélisation

Deux vues du même modèle : le diagramme de classes (le métier) et le schéma relationnel MySQL (la base de données).

## 1. Diagramme de classes

```mermaid
classDiagram
direction TB

class Utilisateur {
  <<abstract>>
  +id
  +nom
  +prenom
  +email
  +telephone
  +motDePasseHash
  +statut
  +mustChangePassword
  +seConnecter()
}
class Administrateur {
}
class Client {
  +adresse
}
class Professeur {
  +bio
  +niveauxEnseignes
  +statut
}
class Ville {
  +id
  +nom
  +estActive
}
class Specialite {
  +id
  +libelle
}
class DemandeProf {
  +id
  +typeBeneficiaire
  +niveauScolaire
  +quartier
  +description
  +budget
  +joursSouhaites
  +caracteristiquesProf
  +statut
  +noteAdmin
  +dateCreation
  +annuler()
}
class Assignation {
  +id
  +dateDebut
  +dateFin
  +tarifClient
  +tarifProf
  +statut
  +genererSeances(mois)
}
class CreneauHebdo {
  +jourSemaine
  +heureDebut
  +heureFin
}
class Seance {
  +id
  +date
  +heureDebut
  +heureFin
  +codeSecret
  +tentativesEchouees
  +statut
  +motifAnnulation
  +dateValidation
  +validerPresence(code)
}
class Paiement {
  +id
  +sens
  +mois
  +annee
  +montant
  +mode
  +reference
  +statut
  +commentaire
  +datePaiement
}

Utilisateur <|-- Administrateur
Utilisateur <|-- Client
Utilisateur <|-- Professeur
Client "1" --> "0..*" DemandeProf : soumet
Administrateur "1" --> "0..*" DemandeProf : traite
Ville "1" --> "0..*" DemandeProf : ciblee par
DemandeProf "0..*" -- "1..*" Specialite : concerne
Professeur "0..*" -- "1..*" Specialite : enseigne
Professeur "0..*" -- "1..*" Ville : intervient dans
DemandeProf "1" --> "0..*" Assignation : donne lieu a
Professeur "1" --> "0..*" Assignation : effectue
Assignation "1" *-- "1..*" CreneauHebdo : planning type
Assignation "1" *-- "0..*" Seance : genere
Assignation "1" --> "0..*" Paiement : donne lieu a
```

## 2. Schéma de base de données (MySQL)

```mermaid
erDiagram
  USERS ||--o| CLIENTS : "est"
  USERS ||--o| PROFESSEURS : "est"
  CLIENTS ||--o{ DEMANDES : "soumet"
  VILLES ||--o{ DEMANDES : "ciblee par"
  DEMANDES ||--o{ DEMANDE_SPECIALITES : "requiert"
  SPECIALITES ||--o{ DEMANDE_SPECIALITES : "est requise"
  PROFESSEURS ||--o{ PROFESSEUR_SPECIALITES : "enseigne"
  SPECIALITES ||--o{ PROFESSEUR_SPECIALITES : "est enseignee"
  PROFESSEURS ||--o{ PROFESSEUR_VILLES : "couvre"
  VILLES ||--o{ PROFESSEUR_VILLES : "est couverte par"
  DEMANDES ||--o{ ASSIGNATIONS : "donne lieu a"
  PROFESSEURS ||--o{ ASSIGNATIONS : "effectue"
  ASSIGNATIONS ||--|{ CRENEAUX_HEBDO : "planning type"
  ASSIGNATIONS ||--o{ SEANCES : "genere"
  ASSIGNATIONS ||--o{ PAIEMENTS : "donne lieu a"

  USERS {
    bigint id PK
    enum role
    string nom
    string prenom
    string email UK
    string telephone UK
    string password_hash
    bool must_change_password
    enum statut
  }
  CLIENTS {
    bigint user_id PK
    string adresse
  }
  PROFESSEURS {
    bigint user_id PK
    text bio
    string niveaux_enseignes
    enum statut
  }
  VILLES {
    int id PK
    string nom UK
    bool est_active
  }
  SPECIALITES {
    int id PK
    string libelle UK
  }
  PROFESSEUR_SPECIALITES {
    bigint professeur_id PK
    int specialite_id PK
  }
  PROFESSEUR_VILLES {
    bigint professeur_id PK
    int ville_id PK
  }
  DEMANDES {
    bigint id PK
    bigint client_id FK
    int ville_id FK
    string quartier
    string niveau_scolaire
    enum type_beneficiaire
    text description
    decimal budget
    json jours_souhaites
    text caracteristiques_prof
    enum statut
    bigint traitee_par FK
    text note_admin
  }
  DEMANDE_SPECIALITES {
    bigint demande_id PK
    int specialite_id PK
  }
  ASSIGNATIONS {
    bigint id PK
    bigint demande_id FK
    bigint professeur_id FK
    date date_debut
    date date_fin
    decimal tarif_client
    decimal tarif_prof
    enum statut
    bigint active_demande_id UK
  }
  CRENEAUX_HEBDO {
    bigint id PK
    bigint assignation_id FK
    tinyint jour_semaine
    time heure_debut
    time heure_fin
  }
  SEANCES {
    bigint id PK
    bigint assignation_id FK
    date date_seance
    time heure_debut
    time heure_fin
    char code_secret
    tinyint tentatives_echouees
    enum statut
    text motif_annulation
    datetime date_validation
  }
  PAIEMENTS {
    bigint id PK
    bigint assignation_id FK
    enum sens
    tinyint mois
    smallint annee
    decimal montant
    enum mode
    string reference
    enum statut
    string commentaire
    datetime date_paiement
  }
```

## 3. Règles de gestion & Conception technique

1. **Utilisateurs & Profils (`users`, `clients`, `professeurs`)** :
   - Table `users` centrale avec héritage Table-Per-Type.
   - Le champ `telephone` est obligatoire (`NOT NULL`) et unique (`uq_users_telephone`), fondamental pour l'authentification OTP et les flux Mobile Money.

2. **Couverture géographique & Spécialités** :
   - Un professeur est associé à une ou plusieurs villes d'intervention (`professeur_villes`) et à ses spécialités de cours (`professeur_specialites`).
   - Une demande cible une ville (`ville_id`) et précise le `quartier` d'intervention ainsi que le `niveau_scolaire` recherché.
   - Une demande peut porter sur une ou plusieurs spécialités via la table de liaison `demande_specialites` (ex: *Mathématiques* et *Physique-Chimie* dans la même mission).

3. **Assignation & Planning** :
   - Le pivot `assignations` relie une demande à un professeur avec les tarifs convenus.
   - La colonne virtuelle générée `active_demande_id` indexée de manière unique garantit qu'une demande n'a qu'**une seule assignation active** à la fois dans le SGBD.
   - Les `creneaux_hebdo` définissent le modèle hebdomadaire récurrent.
   - Les `seances` représentent les dates réelles générées pour le mois avec code secret d'émargement (anti-fraude) et traçabilité du statut (`PREVUE`, `EFFECTUEE`, `MANQUEE`, `ANNULEE`).

4. **Paiements échelonnés** :
   - Les flux `sens` séparent `CLIENT_VERS_ADMIN` et `ADMIN_VERS_PROF`.
   - L'indexation non-unique sur la période permet les règlements en plusieurs tranches (ex: acompte 50% au lancement, solde en milieu de mois).

Le script SQL complet prêt à être exécuté est dans [alloprof_schema.sql](file:///home/nathan-voglossou/AlloProf-Backend/alloprof_schema.sql).
