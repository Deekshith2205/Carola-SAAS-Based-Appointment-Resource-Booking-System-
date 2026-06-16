import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendMessage } from '../utils/apiResponse';
import {
  setAvailability,
  getAvailabilityByStaff,
  updateAvailability,
  deleteAvailability,
} from '../services/staffAvailability.service';
import type {
  CreateAvailabilityInput,
  UpdateAvailabilityInput,
} from '../validations/staffAvailability.validation';

// POST /staff-availability
export const set = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateAvailabilityInput;
  const result = await setAvailability(req.user!.id, req.user!.role, input);
  sendSuccess(res, { availability: result }, { statusCode: 201, message: 'Working hours saved' });
});

// GET /staff-availability/:staffId
export const listByStaff = asyncHandler(async (req: Request, res: Response) => {
  const { staffId } = req.params;
  const result = await getAvailabilityByStaff(staffId);
  sendSuccess(res, { schedule: result });
});

// PATCH /staff-availability/:id
export const update = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const input = req.body as UpdateAvailabilityInput;
  const result = await updateAvailability(id, req.user!.id, req.user!.role, input);
  sendSuccess(res, { availability: result }, { message: 'Working hours updated' });
});

// DELETE /staff-availability/:id
export const remove = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await deleteAvailability(id, req.user!.id, req.user!.role);
  sendMessage(res, 'Working hours record deleted');
});
