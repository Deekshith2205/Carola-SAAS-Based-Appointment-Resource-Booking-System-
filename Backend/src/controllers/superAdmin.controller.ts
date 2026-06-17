import { Request, Response } from 'express';
import { SubscriptionStatus } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { sendPaginated, sendSuccess } from '../utils/apiResponse';
import { parsePagination } from '../utils/pagination';
import * as superAdminService from '../services/superAdmin.service';
import type { PaginationQuery } from '../validations/common.validation';

export const listBusinesses = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as PaginationQuery;
  const pagination = parsePagination(page, limit);

  const result = await superAdminService.listAllBusinesses(pagination);

  sendPaginated(res, 'businesses', result);
});

export const activateBusiness = asyncHandler(async (req: Request, res: Response) => {
  const business = await superAdminService.updateBusinessStatus(
    req.params.id,
    SubscriptionStatus.ACTIVE
  );

  req.auditLog = { action: 'BUSINESS_UPDATE', entity: 'Business', entityId: business.id };

  sendSuccess(res, { business }, { message: 'Business activated successfully' });
});

export const suspendBusiness = asyncHandler(async (req: Request, res: Response) => {
  const business = await superAdminService.updateBusinessStatus(
    req.params.id,
    SubscriptionStatus.SUSPENDED
  );

  req.auditLog = { action: 'BUSINESS_UPDATE', entity: 'Business', entityId: business.id };

  sendSuccess(res, { business }, { message: 'Business suspended successfully' });
});

export const getStatistics = asyncHandler(async (_req: Request, res: Response) => {
  const statistics = await superAdminService.getPlatformStatistics();

  sendSuccess(res, { statistics }, { message: 'Platform statistics retrieved successfully' });
});
