const { Router } = require('express');
const { z } = require('zod');
const referentiels = require('../controllers/referentielController');
const demandes = require('../controllers/adminDemandeController');
const professeurs = require('../controllers/adminProfesseurController');
const users = require('../controllers/adminUserController');
const assignations = require('../controllers/adminAssignationController');
const seances = require('../controllers/adminSeanceController');
const paiements = require('../controllers/adminPaiementController');
const referentielSchemas = require('../validators/referentiel');
const demandeSchemas = require('../validators/demande');
const professeurSchemas = require('../validators/professeur');
const assignationSchemas = require('../validators/assignation');
const seanceSchemas = require('../validators/seance');
const paiementSchemas = require('../validators/paiement');
const { pagination } = require('../validators/common');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

// Referentiels
for (const [path, schema] of [['villes', 'ville'], ['specialites', 'specialite'], ['niveaux', 'niveau']]) {
  router.get(`/${path}`, referentiels[path].list);
  router.post(`/${path}`, validate(referentielSchemas[schema].create), referentiels[path].create);
  router.patch(`/${path}/:id`, validate(referentielSchemas[schema].update), referentiels[path].update);
}

// Demandes
router.get('/demandes', validate(demandeSchemas.list, 'query'), demandes.list);
router.get('/demandes/:id', demandes.get);
router.patch('/demandes/:id', validate(demandeSchemas.adminUpdate), demandes.update);
router.get('/demandes/:id/professeurs-compatibles', demandes.professeursCompatibles);

// Professeurs
router.get('/professeurs', validate(professeurSchemas.list, 'query'), professeurs.list);
router.post('/professeurs', validate(professeurSchemas.create), professeurs.create);
router.get('/professeurs/:id', professeurs.get);
router.patch('/professeurs/:id', validate(professeurSchemas.update), professeurs.update);
router.post('/professeurs/:id/invitation', professeurs.resendInvitation);

// Clients & comptes
router.get('/clients', validate(z.object({ q: z.string().trim().max(100).optional(), ...pagination }), 'query'), users.listClients);
router.get('/clients/:id', users.getClient);
router.patch('/users/:id/statut', validate(z.object({ statut: z.enum(['ACTIF', 'SUSPENDU']) })), users.changeStatut);

// Assignations
router.get('/assignations', validate(assignationSchemas.list, 'query'), assignations.list);
router.post('/assignations', validate(assignationSchemas.create), assignations.create);
router.get('/assignations/:id', assignations.get);
router.patch('/assignations/:id', validate(assignationSchemas.update), assignations.update);
router.patch('/assignations/:id/statut', validate(assignationSchemas.changeStatut), assignations.changeStatut);
router.put('/assignations/:id/creneaux', validate(assignationSchemas.replaceCreneaux), assignations.replaceCreneaux);
router.post('/assignations/:id/seances', validate(assignationSchemas.genererSeances), assignations.genererSeances);
router.get('/assignations/:id/recap', validate(paiementSchemas.recap, 'query'), assignations.recap);

// Seances
router.get('/seances', validate(seanceSchemas.calendrier, 'query'), seances.list);
router.patch('/seances/:id', validate(seanceSchemas.adminUpdate), seances.update);

// Paiements
router.get('/paiements', validate(paiementSchemas.list, 'query'), paiements.list);
router.post('/paiements', validate(paiementSchemas.create), paiements.create);
router.patch('/paiements/:id', validate(paiementSchemas.update), paiements.update);
router.delete('/paiements/:id', paiements.remove);

module.exports = router;
