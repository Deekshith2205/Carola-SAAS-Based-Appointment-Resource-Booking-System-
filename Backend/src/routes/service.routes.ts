import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { tenantContext } from '../middleware/tenant.middleware';
import { validate } from '../middleware/validate.middleware';
import { businessIdParamSchema, businessScopedListQuerySchema, uuidParamSchema } from '../validations/common.validation';
import {
  createServiceSchema,
  updateServiceSchema,
} from '../validations/service.validation';
import * as serviceController from '../controllers/service.controller';

const router = Router();

router.get(
  '/business/:businessId',
  tenantContext,
  validate(businessIdParamSchema, 'params'),
  validate(businessScopedListQuerySchema, 'query'),
  serviceController.listByBusiness
);

router.use(authenticate);
router.use(tenantContext);
router.use(authorize(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN));

router.post('/', validate(createServiceSchema), serviceController.create);
router.patch(
  '/:id',
  validate(uuidParamSchema, 'params'),
  validate(updateServiceSchema),
  serviceController.update
);
router.delete('/:id', validate(uuidParamSchema, 'params'), serviceController.remove);

export default router;
