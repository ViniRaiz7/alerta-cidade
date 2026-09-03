const { Router } = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const denunciaRoutes = require('./denunciaRoutes');
const notificationRoutes = require('./notificationRoutes');

const router = Router();

router.get('/', (req, res) => res.json({ name: 'AlertaCidade API', status: 'ok' }));

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/denuncias', denunciaRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
