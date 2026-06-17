import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { tenantContext } from '../middleware/tenant.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  businessIdParamSchema,
  businessScopedListQuerySchema,
  uuidParamSchema,
} from '../validations/common.validation';
import {
  createResourceSchema,
  updateResourceSchema,
} from '../validations/resource.validation';
import { auditMiddleware } from '../middleware/audit.middleware';
import * as resourceController from '../controllers/resource.controller';

const router = Router();

router.get(
  '/business/:businessId',
  tenantContext,
  validate(businessIdParamSchema, 'params'),
  validate(businessScopedListQuerySchema, 'query'),
  resourceController.listByBusiness
);

router.use(authenticate);
router.use(tenantContext);
router.use(authorize(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN));

router.post('/', validate(createResourceSchema), auditMiddleware, resourceController.create);
router.patch(
  '/:id',
  validate(uuidParamSchema, 'params'),
  validate(updateResourceSchema),
  auditMiddleware,
  resourceController.update
);
router.delete('/:id', validate(uuidParamSchema, 'params'), resourceController.remove);

export default router;
