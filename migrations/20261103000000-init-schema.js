'use strict';

// Schema initial AlloProf (genere depuis docs/alloprof_schema.sql).
// Ecrit en SQL brut : les CHECK et la colonne generee active_demande_id
// ne sont pas exprimables avec queryInterface.createTable.
// Ne plus modifier ce fichier : toute evolution passe par une nouvelle migration.

const statements = [
  `
    CREATE TABLE users (
      id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      role                  ENUM('ADMIN','CLIENT','PROFESSEUR') NOT NULL,
      nom                   VARCHAR(100) NOT NULL,
      prenom                VARCHAR(100) NOT NULL,
      email                 VARCHAR(190) NOT NULL,
      telephone             VARCHAR(30)  NOT NULL,
      password_hash         VARCHAR(255) NULL,  -- NULL tant qu'un prof invite n'a pas defini son mot de passe
      must_change_password  TINYINT(1)   NOT NULL DEFAULT 0,
      statut                ENUM('ACTIF','SUSPENDU') NOT NULL DEFAULT 'ACTIF',
      created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_users_email (email),
      UNIQUE KEY uq_users_telephone (telephone),
      KEY idx_users_role (role)
    ) ENGINE=InnoDB
  `,
  `
    CREATE TABLE clients (
      user_id  BIGINT UNSIGNED NOT NULL,
      adresse  VARCHAR(255) NULL,
      PRIMARY KEY (user_id),
      CONSTRAINT fk_clients_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `,
  `
    CREATE TABLE professeurs (
      user_id        BIGINT UNSIGNED NOT NULL,
      bio            TEXT NULL,
      disponibilite  ENUM('DISPONIBLE','INDISPONIBLE') NOT NULL DEFAULT 'DISPONIBLE',
      PRIMARY KEY (user_id),
      CONSTRAINT fk_professeurs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `,
  `
    CREATE TABLE user_tokens (
      id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id     BIGINT UNSIGNED NOT NULL,
      type        ENUM('INVITATION','RESET_PASSWORD','OTP') NOT NULL,
      token_hash  CHAR(64) NOT NULL,
      tentatives  TINYINT UNSIGNED NOT NULL DEFAULT 0,
      expires_at  DATETIME NOT NULL,
      used_at     DATETIME NULL,
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_user_tokens_hash (token_hash),
      KEY idx_user_tokens_user (user_id, type),
      CONSTRAINT fk_user_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `,
  `
    CREATE TABLE villes (
      id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
      nom        VARCHAR(120) NOT NULL,
      est_active TINYINT(1)   NOT NULL DEFAULT 1,
      PRIMARY KEY (id),
      UNIQUE KEY uq_villes_nom (nom)
    ) ENGINE=InnoDB
  `,
  `
    CREATE TABLE specialites (
      id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
      libelle     VARCHAR(120) NOT NULL,
      est_active  TINYINT(1)   NOT NULL DEFAULT 1,
      PRIMARY KEY (id),
      UNIQUE KEY uq_specialites_libelle (libelle)
    ) ENGINE=InnoDB
  `,
  `
    CREATE TABLE niveaux (
      id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
      libelle     VARCHAR(100) NOT NULL,
      ordre       SMALLINT UNSIGNED NOT NULL,
      est_active  TINYINT(1) NOT NULL DEFAULT 1,
      PRIMARY KEY (id),
      UNIQUE KEY uq_niveaux_libelle (libelle),
      KEY idx_niveaux_ordre (ordre)
    ) ENGINE=InnoDB
  `,
  `
    CREATE TABLE professeur_specialites (
      professeur_id  BIGINT UNSIGNED NOT NULL,
      specialite_id  INT UNSIGNED    NOT NULL,
      PRIMARY KEY (professeur_id, specialite_id),
      CONSTRAINT fk_ps_prof FOREIGN KEY (professeur_id) REFERENCES professeurs (user_id) ON DELETE CASCADE,
      CONSTRAINT fk_ps_spec FOREIGN KEY (specialite_id) REFERENCES specialites (id) ON DELETE RESTRICT
    ) ENGINE=InnoDB
  `,
  `
    CREATE TABLE professeur_villes (
      professeur_id  BIGINT UNSIGNED NOT NULL,
      ville_id       INT UNSIGNED    NOT NULL,
      PRIMARY KEY (professeur_id, ville_id),
      CONSTRAINT fk_pv_prof  FOREIGN KEY (professeur_id) REFERENCES professeurs (user_id) ON DELETE CASCADE,
      CONSTRAINT fk_pv_ville FOREIGN KEY (ville_id)      REFERENCES villes (id)       ON DELETE RESTRICT
    ) ENGINE=InnoDB
  `,
  `
    CREATE TABLE professeur_niveaux (
      professeur_id  BIGINT UNSIGNED NOT NULL,
      niveau_id      INT UNSIGNED    NOT NULL,
      PRIMARY KEY (professeur_id, niveau_id),
      CONSTRAINT fk_pn_prof   FOREIGN KEY (professeur_id) REFERENCES professeurs (user_id) ON DELETE CASCADE,
      CONSTRAINT fk_pn_niveau FOREIGN KEY (niveau_id)     REFERENCES niveaux (id)          ON DELETE RESTRICT
    ) ENGINE=InnoDB
  `,
  `
    CREATE TABLE demandes (
      id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      client_id             BIGINT UNSIGNED NOT NULL,
      ville_id              INT UNSIGNED    NOT NULL,
      quartier              VARCHAR(120)    NULL,
      niveau_id             INT UNSIGNED    NOT NULL,
      type_beneficiaire     ENUM('ENFANT','SOI_MEME') NOT NULL,
      description           TEXT NOT NULL,
      budget                DECIMAL(12,2) NULL,
      jours_souhaites       JSON NULL,
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
      KEY idx_demandes_ville (ville_id),
      CONSTRAINT fk_demandes_client     FOREIGN KEY (client_id)   REFERENCES clients (user_id),
      CONSTRAINT fk_demandes_ville      FOREIGN KEY (ville_id)    REFERENCES villes (id),
      CONSTRAINT fk_demandes_niveau     FOREIGN KEY (niveau_id)   REFERENCES niveaux (id),
      CONSTRAINT fk_demandes_admin      FOREIGN KEY (traitee_par) REFERENCES users (id),
      CONSTRAINT chk_demandes_budget    CHECK (budget IS NULL OR budget >= 0)
    ) ENGINE=InnoDB
  `,
  `
    CREATE TABLE demande_specialites (
      demande_id     BIGINT UNSIGNED NOT NULL,
      specialite_id  INT UNSIGNED    NOT NULL,
      PRIMARY KEY (demande_id, specialite_id),
      CONSTRAINT fk_ds_demande FOREIGN KEY (demande_id)    REFERENCES demandes (id)    ON DELETE CASCADE,
      CONSTRAINT fk_ds_spec    FOREIGN KEY (specialite_id) REFERENCES specialites (id) ON DELETE RESTRICT
    ) ENGINE=InnoDB
  `,
  `
    CREATE TABLE assignations (
      id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      demande_id         BIGINT UNSIGNED NOT NULL,
      professeur_id      BIGINT UNSIGNED NOT NULL,
      date_debut         DATE NOT NULL,
      date_fin           DATE NULL,
      unite_tarif        ENUM('SEANCE','HEURE','MOIS') NOT NULL,
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
    ) ENGINE=InnoDB
  `,
  `
    CREATE TABLE creneaux_hebdo (
      id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      assignation_id BIGINT UNSIGNED NOT NULL,
      jour_semaine   TINYINT UNSIGNED NOT NULL,
      heure_debut    TIME NOT NULL,
      heure_fin      TIME NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_creneau (assignation_id, jour_semaine, heure_debut),
      CONSTRAINT fk_creneaux_assignation FOREIGN KEY (assignation_id) REFERENCES assignations (id) ON DELETE CASCADE,
      CONSTRAINT chk_creneaux_jour  CHECK (jour_semaine BETWEEN 1 AND 7),
      CONSTRAINT chk_creneaux_heure CHECK (heure_fin > heure_debut)
    ) ENGINE=InnoDB
  `,
  `
    CREATE TABLE seances (
      id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      assignation_id       BIGINT UNSIGNED NOT NULL,
      date_seance          DATE NOT NULL,
      heure_debut          TIME NOT NULL,
      heure_fin            TIME NOT NULL,
      code_secret          CHAR(6) NULL,
      code_genere_le       DATETIME NULL,
      tentatives_echouees  TINYINT UNSIGNED NOT NULL DEFAULT 0,
      statut               ENUM('PREVUE','EFFECTUEE','MANQUEE','ANNULEE') NOT NULL DEFAULT 'PREVUE',
      date_validation      DATETIME NULL,
      motif_annulation     TEXT NULL,
      created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_seance (assignation_id, date_seance, heure_debut),
      KEY idx_seances_date (date_seance),
      KEY idx_seances_statut (assignation_id, statut),
      CONSTRAINT fk_seances_assignation FOREIGN KEY (assignation_id) REFERENCES assignations (id),
      CONSTRAINT chk_seances_heure      CHECK (heure_fin > heure_debut),
      CONSTRAINT chk_seances_code       CHECK ((code_secret IS NULL) = (code_genere_le IS NULL)),
      CONSTRAINT chk_seances_validation CHECK (statut <> 'EFFECTUEE' OR date_validation IS NOT NULL)
    ) ENGINE=InnoDB
  `,
  `
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
      commentaire     VARCHAR(255) NULL,
      date_paiement   DATETIME NULL,
      created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_paiements_assignation_periode (assignation_id, sens, annee, mois),
      KEY idx_paiements_statut (statut),
      CONSTRAINT fk_paiements_assignation FOREIGN KEY (assignation_id) REFERENCES assignations (id),
      CONSTRAINT chk_paiements_mois    CHECK (mois BETWEEN 1 AND 12),
      CONSTRAINT chk_paiements_montant CHECK (montant >= 0),
      CONSTRAINT chk_paiements_paye    CHECK (statut <> 'PAYE' OR date_paiement IS NOT NULL)
    ) ENGINE=InnoDB
  `,
  `
    CREATE TABLE notifications (
      id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id     BIGINT UNSIGNED NOT NULL,
      type        VARCHAR(50)  NOT NULL,
      titre       VARCHAR(150) NOT NULL,
      message     TEXT NULL,
      data        JSON NULL,
      lu_le       DATETIME NULL,
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_notifications_user (user_id, lu_le),
      CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `,
];

const tables = ["users","clients","professeurs","user_tokens","villes","specialites","niveaux","professeur_specialites","professeur_villes","professeur_niveaux","demandes","demande_specialites","assignations","creneaux_hebdo","seances","paiements","notifications"];

module.exports = {
  async up(queryInterface) {
    for (const statement of statements) {
      await queryInterface.sequelize.query(statement);
    }
  },

  async down(queryInterface) {
    for (const table of [...tables].reverse()) {
      await queryInterface.sequelize.query(`DROP TABLE IF EXISTS \`${table}\``);
    }
  },
};
