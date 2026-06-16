import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { optionalAuthenticate } from '../middleware/optionalAuth.middleware';
import { tenantContext } from '../middleware/tenant.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createBusinessSchema,
  updateBusinessSchema,
} from '../validations/business.validation';
import { uuidParamSchema, businessListQuerySchema } from '../validations/common.validation';
import * as businessController from '../controllers/business.controller';

const router = Router();

router.get('/', optionalAuthenticate, tenantContext, validate(businessListQuerySchema, 'query'), businessController.list);
router.get('/:id', optionalAuthenticate, tenantContext, validate(uuidParamSchema, 'params'), businessController.getById);

router.post(
  '/',
  authenticate,
  tenantContext,
  authorize(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN),
  validate(createBusinessSchema),
  businessController.create
);
router.patch(
  '/:id',
  authenticate,
  tenantContext,
  authorize(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN),
  validate(uuidParamSchema, 'params'),
  validate(updateBusinessSchema),
  businessController.update
);

export default router;
