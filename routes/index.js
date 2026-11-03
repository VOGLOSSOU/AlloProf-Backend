const { Router } = require('express');

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.use('/auth', require('./auth'));
router.use('/admin', require('./admin'));

module.exports = router;
