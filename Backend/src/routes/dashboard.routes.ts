import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { tenantContext } from '../middleware/tenant.middleware';
import { validate } from '../middleware/validate.middleware';
import { dashboardBaseQuerySchema } from '../validations/dashboard.validation';
import * as dashboardController from '../controllers/dashboard.controller';

const router = Router();

router.use(authenticate);
router.use(tenantContext);
router.use(authorize(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN));

router.get(
  '/',
  validate(dashboardBaseQuerySchema, 'query'),
  dashboardController.getUnifiedDashboard
);

export default router;
