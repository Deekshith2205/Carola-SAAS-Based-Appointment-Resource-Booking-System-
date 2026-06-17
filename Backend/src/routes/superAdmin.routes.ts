import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { uuidParamSchema, paginationQuerySchema } from '../validations/common.validation';
import { auditMiddleware } from '../middleware/audit.middleware';
import * as superAdminController from '../controllers/superAdmin.controller';

const router = Router();

router.use(authenticate);
router.use(authorize(UserRole.SUPER_ADMIN));

router.get(
  '/businesses',
  validate(paginationQuerySchema, 'query'),
  superAdminController.listBusinesses
);

router.patch(
  '/businesses/:id/activate',
  validate(uuidParamSchema, 'params'),
  auditMiddleware,
  superAdminController.activateBusiness
);

router.patch(
  '/businesses/:id/suspend',
  validate(uuidParamSchema, 'params'),
  auditMiddleware,
  superAdminController.suspendBusiness
);

router.get('/statistics', superAdminController.getStatistics);

export default router;
