import { z } from 'zod';
import { DayOfWeek } from '@prisma/client';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

export const createAvailabilitySchema = z
  .object({
    staffId:   z.string().uuid(),
    dayOfWeek: z.nativeEnum(DayOfWeek),
    startTime: z.string().regex(timeRegex, 'Invalid time. Use HH:mm or HH:mm:ss'),
    endTime:   z.string().regex(timeRegex, 'Invalid time. Use HH:mm or HH:mm:ss'),
    isActive:  z.boolean().optional(),
  })
  .refine(
    (d) => {
      const normalize = (t: string) => (t.length === 5 ? `${t}:00` : t);
      return normalize(d.endTime) > normalize(d.startTime);
    },
    { message: 'End time must be after start time', path: ['endTime'] }
  );

export const updateAvailabilitySchema = z
  .object({
    startTime: z.string().regex(timeRegex).optional(),
    endTime:   z.string().regex(timeRegex).optional(),
    isActive:  z.boolean().optional(),
  })
  .refine(
    (d) => {
      if (d.startTime && d.endTime) {
        const normalize = (t: string) => (t.length === 5 ? `${t}:00` : t);
        return normalize(d.endTime) > normalize(d.startTime);
      }
      return true;
    },
    { message: 'End time must be after start time', path: ['endTime'] }
  );

export const staffIdParamSchema = z.object({ staffId: z.string().uuid() });

export type CreateAvailabilityInput = z.infer<typeof createAvailabilitySchema>;
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;
