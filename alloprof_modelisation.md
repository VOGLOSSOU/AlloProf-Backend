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
  +datePaiement
}

Utilisateur <|-- Administrateur
Utilisateur <|-- Client
Utilisateur <|-- Professeur
Client "1" --> "0..*" DemandeProf : soumet
Administrateur "1" --> "0..*" DemandeProf : traite
Ville "1" --> "0..*" DemandeProf : ciblee par
Specialite "1" --> "0..*" DemandeProf : concerne
Professeur "0..*" -- "1..*" Specialite : enseigne
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
  SPECIALITES ||--o{ DEMANDES : "concerne"
  PROFESSEURS ||--o{ PROFESSEUR_SPECIALITES : "enseigne"
  SPECIALITES ||--o{ PROFESSEUR_SPECIALITES : "est enseignee"
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
    string telephone
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
  DEMANDES {
    bigint id PK
    bigint client_id FK
    int ville_id FK
    int specialite_id FK
    enum type_beneficiaire
    text description
    decimal budget
    set jours_souhaites
    text caracteristiques_prof
    enum statut
    bigint traitee_par FK
    text note_admin
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
    datetime date_paiement
  }
```

Le script SQL complet est dans alloprof_schema.sql.
