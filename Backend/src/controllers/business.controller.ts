import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { sendPaginated, sendSuccess } from '../utils/apiResponse';
import { parsePagination } from '../utils/pagination';
import { assertBusinessOwner } from '../services/businessAccess.service';
import * as businessService from '../services/business.service';
import type { BusinessListQuery } from '../validations/common.validation';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const business = await businessService.createBusiness(req.user!.id, req.body);

  sendSuccess(res, { business }, {
    message: 'Business created successfully',
    statusCode: 201,
  });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as BusinessListQuery;
  const pagination = parsePagination(page, limit);

  const result = req.user
    ? await businessService.listBusinesses(req.user.id, req.user.role, pagination)
    : await businessService.listPublicBusinesses(pagination);

  sendPaginated(res, 'businesses', result);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const business = req.user
    ? await businessService.getBusinessById(req.params.id)
    : await businessService.getPublicBusinessById(req.params.id);

  sendSuccess(res, { business });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  if (req.user!.role === UserRole.BUSINESS_OWNER) {
    await assertBusinessOwner(req.params.id, req.user!.id);
  } else if (req.user!.role !== UserRole.SUPER_ADMIN) {
    throw new AppError('Insufficient permissions', 403);
  }

  const business = await businessService.updateBusiness(req.params.id, req.body);

  sendSuccess(res, { business }, { message: 'Business updated successfully' });
});
