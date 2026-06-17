import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendMessage, sendPaginated, sendSuccess } from '../utils/apiResponse';
import { parsePagination } from '../utils/pagination';
import * as staffService from '../services/staff.service';
import type { BusinessScopedListQuery } from '../validations/common.validation';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const staff = await staffService.createStaff(req.user!.id, req.user!.role, req.body);

  req.auditLog = { action: 'STAFF_CREATION', entity: 'Staff', entityId: staff.id };

  sendSuccess(res, { staff }, {
    message: 'Staff member added successfully',
    statusCode: 201,
  });
});

export const listByBusiness = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as unknown as BusinessScopedListQuery;
  const pagination = parsePagination(page, limit);

  const result = await staffService.listStaffByBusiness(req.params.businessId, pagination);

  sendPaginated(res, 'staff', result);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const staff = await staffService.updateStaff(
    req.params.id,
    req.user!.id,
    req.user!.role,
    req.body
  );

  req.auditLog = { action: 'STAFF_UPDATE', entity: 'Staff', entityId: staff.id };

  sendSuccess(res, { staff }, { message: 'Staff member updated successfully' });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await staffService.deleteStaff(req.params.id, req.user!.id, req.user!.role);

  sendMessage(res, 'Staff member removed successfully');
});
