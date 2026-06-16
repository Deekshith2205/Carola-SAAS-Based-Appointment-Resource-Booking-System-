import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { tenantContext } from '../middleware/tenant.middleware';
import { validate } from '../middleware/validate.middleware';
import { uuidParamSchema } from '../validations/common.validation';
import {
  createLeaveSchema,
  updateLeaveStatusSchema,
  leaveListQuerySchema,
} from '../validations/staffLeave.validation';
import * as leaveController from '../controllers/staffLeave.controller';

const router = Router();

// All leave routes require authentication
router.use(authenticate);
router.use(tenantContext);

// Staff can request leave for themselves;
// Business owners / super admin can submit on behalf of any staff
router.post(
  '/',
  authorize(UserRole.STAFF, UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN),
  validate(createLeaveSchema),
  leaveController.request
);

// All authenticated roles can list (service layer applies role-based filtering)
router.get(
  '/',
  authorize(UserRole.STAFF, UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN),
  validate(leaveListQuerySchema, 'query'),
  leaveController.list
);

// Get single leave by ID
router.get(
  '/:id',
  authorize(UserRole.STAFF, UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN),
  validate(uuidParamSchema, 'params'),
  leaveController.getById
);

// Update leave status (approve/reject: owner/admin; cancel: staff)
router.patch(
  '/:id/status',
  authorize(UserRole.STAFF, UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN),
  validate(uuidParamSchema, 'params'),
  validate(updateLeaveStatusSchema),
  leaveController.updateStatus
);

export default router;
