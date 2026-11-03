const { Router } = require('express');
const professeurs = require('../controllers/adminProfesseurController');
const professeurSchemas = require('../validators/professeur');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

router.post('/professeurs', validate(professeurSchemas.create), professeurs.create);
router.post('/professeurs/:id/invitation', professeurs.resendInvitation);

module.exports = router;
