import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { loginSchema, registerSchema } from '../validations/auth.validation';
import { auditMiddleware } from '../middleware/audit.middleware';
import * as authController from '../controllers/auth.controller';

const router = Router();

router.post('/register', validate(registerSchema), auditMiddleware, authController.register);
router.post('/login', validate(loginSchema), auditMiddleware, authController.login);
router.get('/me', authenticate, authController.getMe);

export default router;
