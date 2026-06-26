import { z } from 'zod';
import { AvailabilityStatus, DayOfWeek } from '@prisma/client';

export const breakSchema = z.object({
  name: z.string().min(1),
  startTime: z.string(), // expected HH:mm format
  endTime: z.string(),
});

export const workingHourSchema = z.object({
  dayOfWeek: z.nativeEnum(DayOfWeek),
  startTime: z.string(),
  endTime: z.string(),
  isActive: z.boolean(),
  breaks: z.array(breakSchema).optional(),
});

export const createStaffSchema = z.object({
  businessId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(2).max(100),
  phone: z.string().optional(),
  designation: z.string().trim().max(100).optional(),
  department: z.string().optional(),
  yearsOfExperience: z.number().optional(),
  bio: z.string().optional(),
  certifications: z.array(z.string()).optional(),
  specializations: z.array(z.string()).optional(),
  availabilityStatus: z.nativeEnum(AvailabilityStatus).optional(),
  serviceIds: z.array(z.string().uuid()).optional(),
  workingHours: z.array(workingHourSchema).optional(),
});

export const updateStaffSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  designation: z.string().trim().max(100).optional(),
  department: z.string().optional(),
  yearsOfExperience: z.number().optional(),
  bio: z.string().optional(),
  certifications: z.array(z.string()).optional(),
  specializations: z.array(z.string()).optional(),
  availabilityStatus: z.nativeEnum(AvailabilityStatus).optional(),
  serviceIds: z.array(z.string().uuid()).optional(),
  workingHours: z.array(workingHourSchema).optional(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
