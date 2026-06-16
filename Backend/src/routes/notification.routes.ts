import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  notificationListQuerySchema,
  uuidParamSchema,
} from '../validations/common.validation';
import * as notificationController from '../controllers/notification.controller';

const router = Router();

router.use(authenticate);

router.get('/', validate(notificationListQuerySchema, 'query'), notificationController.list);
router.patch('/read-all', notificationController.markAllRead);
router.patch(
  '/:id/read',
  validate(uuidParamSchema, 'params'),
  notificationController.markRead
);

export default router;
