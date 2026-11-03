const { Router } = require('express');
const { z } = require('zod');
const client = require('../controllers/clientController');
const demandeSchemas = require('../validators/demande');
const seanceSchemas = require('../validators/seance');
const { pagination } = require('../validators/common');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');

const router = Router();

router.use(authenticate, requireRole('CLIENT'));

router.post('/demandes', validate(demandeSchemas.create), client.createDemande);
router.get('/demandes', validate(demandeSchemas.list, 'query'), client.listDemandes);
router.get('/demandes/:id', client.getDemande);
router.post('/demandes/:id/annuler', client.annulerDemande);

router.get('/seances', validate(seanceSchemas.calendrier, 'query'), client.calendrier);
router.get('/seances/aujourdhui', client.seancesDuJour);

router.get('/paiements', validate(z.object(pagination), 'query'), client.paiements);

module.exports = router;
