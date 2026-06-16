import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { tenantContext } from '../middleware/tenant.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
} from '../validations/appointment.validation';
import {
  appointmentListQuerySchema,
  uuidParamSchema,
} from '../validations/common.validation';
import * as appointmentController from '../controllers/appointment.controller';

const router = Router();

router.use(authenticate);
router.use(tenantContext);

router.post(
  '/',
  authorize(UserRole.CUSTOMER, UserRole.SUPER_ADMIN),
  validate(createAppointmentSchema),
  appointmentController.create
);
router.get('/', validate(appointmentListQuerySchema, 'query'), appointmentController.list);
router.get('/:id', validate(uuidParamSchema, 'params'), appointmentController.getById);
router.patch(
  '/:id',
  validate(uuidParamSchema, 'params'),
  validate(updateAppointmentSchema),
  appointmentController.update
);
router.patch(
  '/:id/cancel',
  validate(uuidParamSchema, 'params'),
  appointmentController.cancel
);

export default router;
