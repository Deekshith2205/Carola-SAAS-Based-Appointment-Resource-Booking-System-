import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendMessage, sendPaginated, sendSuccess } from '../utils/apiResponse';
import { parsePagination } from '../utils/pagination';
import * as serviceService from '../services/service.service';
import type { BusinessScopedListQuery } from '../validations/common.validation';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const service = await serviceService.createService(req.user!.id, req.user!.role, req.body);

  sendSuccess(res, { service }, {
    message: 'Service created successfully',
    statusCode: 201,
  });
});

export const listByBusiness = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as BusinessScopedListQuery;
  const pagination = parsePagination(page, limit);

  const result = await serviceService.listServicesByBusiness(req.params.businessId, pagination);

  sendPaginated(res, 'services', result);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const service = await serviceService.updateService(
    req.params.id,
    req.user!.id,
    req.user!.role,
    req.body
  );

  sendSuccess(res, { service }, { message: 'Service updated successfully' });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await serviceService.deleteService(req.params.id, req.user!.id, req.user!.role);

  sendMessage(res, 'Service deleted successfully');
});
