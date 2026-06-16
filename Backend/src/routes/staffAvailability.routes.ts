import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { tenantContext } from '../middleware/tenant.middleware';
import { validate } from '../middleware/validate.middleware';
import { uuidParamSchema } from '../validations/common.validation';
import {
  createAvailabilitySchema,
  updateAvailabilitySchema,
  staffIdParamSchema,
} from '../validations/staffAvailability.validation';
import * as availabilityController from '../controllers/staffAvailability.controller';

const router = Router();

// Public — anyone with tenant context can view a staff member's schedule
router.get(
  '/:staffId',
  tenantContext,
  validate(staffIdParamSchema, 'params'),
  availabilityController.listByStaff
);

// Protected — only business owners and super admin can modify schedules
router.use(authenticate);
router.use(tenantContext);
router.use(authorize(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN));

router.post(
  '/',
  validate(createAvailabilitySchema),
  availabilityController.set
);

router.patch(
  '/:id',
  validate(uuidParamSchema, 'params'),
  validate(updateAvailabilitySchema),
  availabilityController.update
);

router.delete(
  '/:id',
  validate(uuidParamSchema, 'params'),
  availabilityController.remove
);

export default router;
