import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendMessage, sendPaginated, sendSuccess } from '../utils/apiResponse';
import { parsePagination } from '../utils/pagination';
import * as resourceService from '../services/resource.service';
import type { BusinessScopedListQuery } from '../validations/common.validation';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const resource = await resourceService.createResource(req.user!.id, req.user!.role, req.body);

  req.auditLog = { action: 'RESOURCE_CREATION', entity: 'Resource', entityId: resource.id };

  sendSuccess(res, { resource }, {
    message: 'Resource created successfully',
    statusCode: 201,
  });
});

export const listByBusiness = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as BusinessScopedListQuery;
  const pagination = parsePagination(page, limit);

  const result = await resourceService.listResourcesByBusiness(req.params.businessId, pagination);

  sendPaginated(res, 'resources', result);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const resource = await resourceService.updateResource(
    req.params.id,
    req.user!.id,
    req.user!.role,
    req.body
  );

  req.auditLog = { action: 'RESOURCE_UPDATE', entity: 'Resource', entityId: resource.id };

  sendSuccess(res, { resource }, { message: 'Resource updated successfully' });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await resourceService.deleteResource(req.params.id, req.user!.id, req.user!.role);

  sendMessage(res, 'Resource deleted successfully');
});
