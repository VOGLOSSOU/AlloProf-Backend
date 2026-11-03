const { Router } = require('express');
const referentiels = require('../controllers/referentielController');
const notifications = require('../controllers/notificationController');
const notificationSchemas = require('../validators/notification');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Public : alimente le formulaire de demande et d'inscription
router.get('/referentiels', referentiels.listActifs);

router.use('/auth', require('./auth'));

router.get('/notifications', authenticate, validate(notificationSchemas.list, 'query'), notifications.list);
router.post('/notifications/lire-tout', authenticate, notifications.toutMarquerLu);
router.post('/notifications/:id/lire', authenticate, notifications.marquerLue);

router.use('/client', require('./client'));
router.use('/prof', require('./prof'));
router.use('/admin', require('./admin'));

module.exports = router;
