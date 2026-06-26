import { z } from 'zod';
import { AvailabilityStatus } from '@prisma/client';

export const createStaffSchema = z.object({
  businessId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(2).max(100),
  designation: z.string().trim().max(100).optional(),
  availabilityStatus: z.nativeEnum(AvailabilityStatus).optional(),
});

export const updateStaffSchema = z.object({
  designation: z.string().trim().max(100).optional(),
  availabilityStatus: z.nativeEnum(AvailabilityStatus).optional(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
