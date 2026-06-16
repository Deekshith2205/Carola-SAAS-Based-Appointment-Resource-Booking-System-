import { z } from 'zod';
import { LeaveStatus } from '@prisma/client';

export const createLeaveSchema = z.object({
  staffId:   z.string().uuid(),
  leaveDate: z.string().date('Invalid date. Use YYYY-MM-DD'),
  reason:    z.string().trim().max(500).optional(),
});

export const updateLeaveStatusSchema = z.object({
  status: z.enum([
    LeaveStatus.APPROVED,
    LeaveStatus.REJECTED,
    LeaveStatus.CANCELLED,
  ]),
});

export const leaveListQuerySchema = z.object({
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
  businessId: z.string().uuid().optional(),
  staffId:    z.string().uuid().optional(),
  status:     z.nativeEnum(LeaveStatus).optional(),
});

export type CreateLeaveInput        = z.infer<typeof createLeaveSchema>;
export type UpdateLeaveStatusInput  = z.infer<typeof updateLeaveStatusSchema>;
export type LeaveListQuery          = z.infer<typeof leaveListQuerySchema>;
