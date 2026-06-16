import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { tenantContext } from '../middleware/tenant.middleware';
import { validate } from '../middleware/validate.middleware';
import { businessIdParamSchema, businessScopedListQuerySchema, uuidParamSchema } from '../validations/common.validation';
import { createStaffSchema, updateStaffSchema } from '../validations/staff.validation';
import * as staffController from '../controllers/staff.controller';

const router = Router();

router.get(
  '/business/:businessId',
  tenantContext,
  validate(businessIdParamSchema, 'params'),
  validate(businessScopedListQuerySchema, 'query'),
  staffController.listByBusiness
);

router.use(authenticate);
router.use(tenantContext);
router.use(authorize(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN));

router.post('/', validate(createStaffSchema), staffController.create);
router.patch(
  '/:id',
  validate(uuidParamSchema, 'params'),
  validate(updateStaffSchema),
  staffController.update
);
router.delete('/:id', validate(uuidParamSchema, 'params'), staffController.remove);

export default router;
