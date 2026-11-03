const { User, Client, Professeur, Ville, Niveau, Specialite, Demande, CreneauHebdo } = require('../models');

// Fragments d'include reutilises par les controllers.
// Ce sont des fonctions : Sequelize modifie les objets d'include qu'on lui passe.

const USER_PUBLIC = ['id', 'nom', 'prenom', 'email', 'telephone', 'statut'];

const sansLiaison = () => ({ attributes: [] });

const user = () => ({ model: User, as: 'user', attributes: USER_PUBLIC });

const clientAvecUser = () => ({ model: Client, as: 'client', include: [user()] });

const referentielsProf = () => [
  { model: Specialite, as: 'specialites', through: sansLiaison() },
  { model: Ville, as: 'villes', through: sansLiaison() },
  { model: Niveau, as: 'niveaux', through: sansLiaison() },
];

const professeurAvecUser = () => ({ model: Professeur, as: 'professeur', include: [user()] });

const detailsDemande = () => [
  { model: Ville, as: 'ville' },
  { model: Niveau, as: 'niveau' },
  { model: Specialite, as: 'specialites', through: sansLiaison() },
];

const demandeComplete = () => ({
  model: Demande,
  as: 'demande',
  include: [...detailsDemande(), clientAvecUser()],
});

const creneaux = () => ({ model: CreneauHebdo, as: 'creneaux' });

// Ordre stable des creneaux : par jour puis par heure
const ORDRE_CRENEAUX = [[{ model: CreneauHebdo, as: 'creneaux' }, 'jourSemaine', 'ASC'], [{ model: CreneauHebdo, as: 'creneaux' }, 'heureDebut', 'ASC']];

// Retire les cles absentes d'un PATCH (undefined) ; null reste une valeur volontaire
function defined(values) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}

function paginate({ page, limit }) {
  return { limit, offset: (page - 1) * limit };
}

function pageResponse({ rows, count }, { page, limit }) {
  return { data: rows, total: count, page, limit };
}

module.exports = {
  USER_PUBLIC,
  sansLiaison,
  user,
  clientAvecUser,
  referentielsProf,
  professeurAvecUser,
  detailsDemande,
  demandeComplete,
  creneaux,
  ORDRE_CRENEAUX,
  defined,
  paginate,
  pageResponse,
};
