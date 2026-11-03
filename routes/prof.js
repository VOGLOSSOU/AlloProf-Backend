const { Router } = require('express');
const { z } = require('zod');
const prof = require('../controllers/profController');
const seanceSchemas = require('../validators/seance');
const { pagination } = require('../validators/common');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');

const router = Router();

router.use(authenticate, requireRole('PROFESSEUR'));

router.get(
  '/assignations',
  validate(z.object({ statut: z.enum(['ACTIVE', 'SUSPENDUE', 'TERMINEE']).optional() }), 'query'),
  prof.assignations,
);

router.get('/seances', validate(seanceSchemas.calendrier, 'query'), prof.calendrier);
router.post('/seances/:id/valider', validate(seanceSchemas.valider), prof.valider);

router.get('/paiements', validate(z.object(pagination), 'query'), prof.paiements);

module.exports = router;
