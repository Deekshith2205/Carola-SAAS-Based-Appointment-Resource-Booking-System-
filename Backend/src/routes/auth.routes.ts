import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { loginSchema, registerSchema, updateProfileSchema, changePasswordSchema } from '../validations/auth.validation';
import { auditMiddleware } from '../middleware/audit.middleware';
import * as authController from '../controllers/auth.controller';

const router = Router();

router.post('/register', validate(registerSchema), auditMiddleware, authController.register);
router.post('/login', validate(loginSchema), auditMiddleware, authController.login);
router.post('/refresh', authController.refresh);
router.get('/me', authenticate, authController.getMe);
router.patch('/me', authenticate, validate(updateProfileSchema), authController.updateMe);
router.patch('/change-password', authenticate, validate(changePasswordSchema), auditMiddleware, authController.changePassword);

export default router;
