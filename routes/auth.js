const { Router } = require('express');
const auth = require('../controllers/authController');
const schemas = require('../validators/auth');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

const router = Router();

router.post('/register', authLimiter, validate(schemas.register), auth.register);
router.post('/login', authLimiter, validate(schemas.login), auth.login);
router.get('/me', authenticate, auth.me);

router.post('/password/change', authenticate, validate(schemas.changePassword), auth.changePassword);
router.post('/password/forgot', authLimiter, validate(schemas.forgotPassword), auth.forgotPassword);
router.post('/password/reset', authLimiter, validate(schemas.resetPassword), auth.resetPassword);

router.post('/invitation/accept', authLimiter, validate(schemas.acceptInvitation), auth.acceptInvitation);

module.exports = router;
