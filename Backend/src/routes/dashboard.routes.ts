import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { tenantContext } from '../middleware/tenant.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  dashboardBaseQuerySchema,
  dateRangeQuerySchema,
  popularServicesQuerySchema,
  revenueTrendQuerySchema,
} from '../validations/dashboard.validation';
import * as dashboardController from '../controllers/dashboard.controller';

const router = Router();

router.use(authenticate);
router.use(tenantContext);
router.use(authorize(UserRole.BUSINESS_OWNER, UserRole.SUPER_ADMIN));

router.get(
  '/summary',
  validate(dashboardBaseQuerySchema, 'query'),
  dashboardController.getSummary
);

router.get(
  '/revenue-trends',
  validate(revenueTrendQuerySchema, 'query'),
  dashboardController.getRevenueTrends
);

router.get(
  '/staff-utilization',
  validate(dateRangeQuerySchema, 'query'),
  dashboardController.getStaffUtilization
);

router.get(
  '/popular-services',
  validate(popularServicesQuerySchema, 'query'),
  dashboardController.getPopularServices
);

router.get(
  '/status-distribution',
  validate(dateRangeQuerySchema, 'query'),
  dashboardController.getStatusDistribution
);

export default router;
