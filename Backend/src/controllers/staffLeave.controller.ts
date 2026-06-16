import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendPaginated } from '../utils/apiResponse';
import { parsePagination } from '../utils/pagination';
import {
  requestLeave,
  listLeaves,
  updateLeaveStatus,
  getLeaveById,
} from '../services/staffLeave.service';
import type {
  CreateLeaveInput,
  UpdateLeaveStatusInput,
  LeaveListQuery,
} from '../validations/staffLeave.validation';

// POST /staff-leave
export const request = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateLeaveInput;
  const result = await requestLeave(req.user!.id, req.user!.role, input);
  sendSuccess(res, { leave: result }, { statusCode: 201, message: 'Leave request submitted' });
});

// GET /staff-leave
export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as LeaveListQuery;
  const pagination = parsePagination(query.page, query.limit);
  const result = await listLeaves(req.user!.id, req.user!.role, query, pagination);
  sendPaginated(res, 'leaves', result);
});

// GET /staff-leave/:id
export const getById = asyncHandler(async (req: Request, res: Response) => {
  const result = await getLeaveById(req.params.id, req.user!.id, req.user!.role);
  sendSuccess(res, { leave: result });
});

// PATCH /staff-leave/:id/status
export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as UpdateLeaveStatusInput;
  const result = await updateLeaveStatus(req.params.id, req.user!.id, req.user!.role, input);
  sendSuccess(res, { leave: result }, { message: `Leave request ${input.status.toLowerCase()}` });
});
