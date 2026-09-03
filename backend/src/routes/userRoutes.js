const { Router } = require('express');
const userController = require('../controllers/userController');
const validate = require('../middlewares/validate');
const { authenticate, authorize } = require('../middlewares/auth');
const { avatarUpload } = require('../middlewares/upload');
const { createUserSchema, resetPasswordSchema, listUsersQuerySchema } = require('../validators/userValidators');

const router = Router();

// qualquer usuário autenticado pode trocar a própria foto
router.patch('/me/photo', authenticate, avatarUpload.single('photo'), userController.updateMyPhoto);

// o restante do painel de usuários é exclusivo do SUPERADMIN
router.get('/', authenticate, authorize('SUPERADMIN'), validate(listUsersQuerySchema), userController.listUsers);
router.post('/', authenticate, authorize('SUPERADMIN'), validate(createUserSchema), userController.createUser);
router.patch('/:id/password', authenticate, authorize('SUPERADMIN'), validate(resetPasswordSchema), userController.resetPassword);

module.exports = router;
