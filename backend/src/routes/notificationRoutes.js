const { Router } = require('express');
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/auth');

const router = Router();

router.get('/', authenticate, notificationController.listMine);
router.patch('/read-all', authenticate, notificationController.markAllRead);
router.patch('/:id/read', authenticate, notificationController.markOneRead);

module.exports = router;
