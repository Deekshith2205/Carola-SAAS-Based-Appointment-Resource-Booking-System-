import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { tenantContext } from '../middleware/tenant.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  updateAppointmentStatusSchema,
  appointmentSlotQuerySchema,
} from '../validations/appointment.validation';
import {
  appointmentListQuerySchema,
  uuidParamSchema,
} from '../validations/common.validation';
import { auditMiddleware } from '../middleware/audit.middleware';
import * as appointmentController from '../controllers/appointment.controller';

const router = Router();

router.use(authenticate);
router.use(tenantContext);

router.post(
  '/',
  authorize(UserRole.CUSTOMER, UserRole.BUSINESS_OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN),
  validate(createAppointmentSchema),
  auditMiddleware,
  appointmentController.create
);
router.get('/', validate(appointmentListQuerySchema, 'query'), appointmentController.list);
router.get('/slots', validate(appointmentSlotQuerySchema, 'query'), appointmentController.getSlots);
router.get('/:id', validate(uuidParamSchema, 'params'), appointmentController.getById);
router.patch(
  '/:id/status',
  validate(uuidParamSchema, 'params'),
  validate(updateAppointmentStatusSchema),
  auditMiddleware,
  appointmentController.updateStatus
);
router.patch(
  '/:id',
  validate(uuidParamSchema, 'params'),
  validate(updateAppointmentSchema),
  auditMiddleware,
  appointmentController.update
);
router.patch(
  '/:id/cancel',
  validate(uuidParamSchema, 'params'),
  auditMiddleware,
  appointmentController.cancel
);

export default router;
