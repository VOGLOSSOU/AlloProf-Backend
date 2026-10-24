-- ============================================================
-- AlloProf - Schema MySQL 8.0.16+ (InnoDB, utf8mb4)
-- Les CHECK ne sont appliquees qu'a partir de MySQL 8.0.16
-- ============================================================

CREATE DATABASE IF NOT EXISTS alloprof
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE alloprof;

-- ------------------------------------------------------------
-- Utilisateurs : une table commune + une table de profil par role
-- (l'administrateur n'a pas besoin de table de profil pour l'instant)
-- ------------------------------------------------------------
CREATE TABLE users (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  role                  ENUM('ADMIN','CLIENT','PROFESSEUR') NOT NULL,
  nom                   VARCHAR(100) NOT NULL,
  prenom                VARCHAR(100) NOT NULL,
  email                 VARCHAR(190) NOT NULL,
  telephone             VARCHAR(30)  NULL,
  password_hash         VARCHAR(255) NOT NULL,
  must_change_password  TINYINT(1)   NOT NULL DEFAULT 0,
  statut                ENUM('ACTIF','SUSPENDU') NOT NULL DEFAULT 'ACTIF',
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role)
) ENGINE=InnoDB;

CREATE TABLE clients (
  user_id  BIGINT UNSIGNED NOT NULL,
  adresse  VARCHAR(255) NULL,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_clients_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE professeurs (
  user_id            BIGINT UNSIGNED NOT NULL,
  bio                TEXT NULL,
  niveaux_enseignes  VARCHAR(255) NULL,
  statut             ENUM('ACTIF','INACTIF') NOT NULL DEFAULT 'ACTIF',
  PRIMARY KEY (user_id),
  CONSTRAINT fk_professeurs_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Referentiels geres par l'admin
-- ------------------------------------------------------------
CREATE TABLE villes (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nom        VARCHAR(120) NOT NULL,
  est_active TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_villes_nom (nom)
) ENGINE=InnoDB;

CREATE TABLE specialites (
  id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  libelle  VARCHAR(120) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_specialites_libelle (libelle)
) ENGINE=InnoDB;

CREATE TABLE professeur_specialites (
  professeur_id  BIGINT UNSIGNED NOT NULL,
  specialite_id  INT UNSIGNED    NOT NULL,
  PRIMARY KEY (professeur_id, specialite_id),
  CONSTRAINT fk_ps_prof FOREIGN KEY (professeur_id) REFERENCES professeurs (user_id),
  CONSTRAINT fk_ps_spec FOREIGN KEY (specialite_id) REFERENCES specialites (id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Demande du client (le besoin, pas le contrat)
-- ------------------------------------------------------------
CREATE TABLE demandes (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id             BIGINT UNSIGNED NOT NULL,
  ville_id              INT UNSIGNED    NOT NULL,
  specialite_id         INT UNSIGNED    NOT NULL,
  type_beneficiaire     ENUM('ENFANT','SOI_MEME') NOT NULL,
  description           TEXT NOT NULL,
  budget                DECIMAL(12,2) NULL,
  jours_souhaites       SET('LUN','MAR','MER','JEU','VEN','SAM','DIM') NULL,
  caracteristiques_prof TEXT NULL,
  statut                ENUM('EN_ATTENTE','EN_RECHERCHE','ASSIGNEE','ANNULEE','REJETEE')
                        NOT NULL DEFAULT 'EN_ATTENTE',
  traitee_par           BIGINT UNSIGNED NULL,
  note_admin            TEXT NULL,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_demandes_statut (statut),
  KEY idx_demandes_client (client_id),
  CONSTRAINT fk_demandes_client     FOREIGN KEY (client_id)     REFERENCES clients (user_id),
  CONSTRAINT fk_demandes_ville      FOREIGN KEY (ville_id)      REFERENCES villes (id),
  CONSTRAINT fk_demandes_specialite FOREIGN KEY (specialite_id) REFERENCES specialites (id),
  CONSTRAINT fk_demandes_admin      FOREIGN KEY (traitee_par)   REFERENCES users (id),
  CONSTRAINT chk_demandes_budget    CHECK (budget IS NULL OR budget >= 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Assignation : le pivot (demande + prof + tarifs)
-- La colonne generee garantit UNE SEULE assignation ACTIVE par demande
-- ------------------------------------------------------------
CREATE TABLE assignations (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  demande_id         BIGINT UNSIGNED NOT NULL,
  professeur_id      BIGINT UNSIGNED NOT NULL,
  date_debut         DATE NOT NULL,
  date_fin           DATE NULL,
  tarif_client       DECIMAL(12,2) NOT NULL,
  tarif_prof         DECIMAL(12,2) NOT NULL,
  statut             ENUM('ACTIVE','SUSPENDUE','TERMINEE') NOT NULL DEFAULT 'ACTIVE',
  active_demande_id  BIGINT UNSIGNED
                     GENERATED ALWAYS AS (IF(statut = 'ACTIVE', demande_id, NULL)) STORED,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_une_active_par_demande (active_demande_id),
  KEY idx_assignations_prof (professeur_id, statut),
  CONSTRAINT fk_assignations_demande FOREIGN KEY (demande_id)    REFERENCES demandes (id),
  CONSTRAINT fk_assignations_prof    FOREIGN KEY (professeur_id) REFERENCES professeurs (user_id),
  CONSTRAINT chk_assignations_dates  CHECK (date_fin IS NULL OR date_fin >= date_debut),
  CONSTRAINT chk_assignations_tarifs CHECK (tarif_client >= 0 AND tarif_prof >= 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Planning type hebdomadaire (jour_semaine : 1 = lundi ... 7 = dimanche)
-- ------------------------------------------------------------
CREATE TABLE creneaux_hebdo (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  assignation_id BIGINT UNSIGNED NOT NULL,
  jour_semaine   TINYINT UNSIGNED NOT NULL,
  heure_debut    TIME NOT NULL,
  heure_fin      TIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_creneau (assignation_id, jour_semaine, heure_debut),
  CONSTRAINT fk_creneaux_assignation FOREIGN KEY (assignation_id) REFERENCES assignations (id),
  CONSTRAINT chk_creneaux_jour  CHECK (jour_semaine BETWEEN 1 AND 7),
  CONSTRAINT chk_creneaux_heure CHECK (heure_fin > heure_debut)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Seances : chaque jour de cours reel, avec son code secret
-- ------------------------------------------------------------
CREATE TABLE seances (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  assignation_id       BIGINT UNSIGNED NOT NULL,
  date_seance          DATE NOT NULL,
  heure_debut          TIME NOT NULL,
  heure_fin            TIME NOT NULL,
  code_secret          CHAR(6) NOT NULL,
  tentatives_echouees  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  statut               ENUM('PREVUE','EFFECTUEE','MANQUEE','ANNULEE') NOT NULL DEFAULT 'PREVUE',
  date_validation      DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_seance (assignation_id, date_seance, heure_debut),
  KEY idx_seances_date (date_seance),
  KEY idx_seances_statut (assignation_id, statut),
  CONSTRAINT fk_seances_assignation FOREIGN KEY (assignation_id) REFERENCES assignations (id),
  CONSTRAINT chk_seances_heure CHECK (heure_fin > heure_debut)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Paiements : client vers admin, puis admin vers prof (par mois)
-- ------------------------------------------------------------
CREATE TABLE paiements (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  assignation_id  BIGINT UNSIGNED NOT NULL,
  sens            ENUM('CLIENT_VERS_ADMIN','ADMIN_VERS_PROF') NOT NULL,
  mois            TINYINT UNSIGNED NOT NULL,
  annee           SMALLINT UNSIGNED NOT NULL,
  montant         DECIMAL(12,2) NOT NULL,
  mode            ENUM('MOBILE_MONEY','ESPECES','VIREMENT') NULL,
  reference       VARCHAR(100) NULL,
  statut          ENUM('EN_ATTENTE','PAYE') NOT NULL DEFAULT 'EN_ATTENTE',
  date_paiement   DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_paiement_mois (assignation_id, sens, annee, mois),
  CONSTRAINT fk_paiements_assignation FOREIGN KEY (assignation_id) REFERENCES assignations (id),
  CONSTRAINT chk_paiements_mois    CHECK (mois BETWEEN 1 AND 12),
  CONSTRAINT chk_paiements_montant CHECK (montant >= 0)
) ENGINE=InnoDB;
