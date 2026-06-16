import { z } from 'zod';
import { AppointmentStatus } from '@prisma/client';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

function isEndAfterStart(startTime: string, endTime: string): boolean {
  const normalize = (time: string) => (time.length === 5 ? `${time}:00` : time);
  return normalize(endTime) > normalize(startTime);
}

export const createAppointmentSchema = z
  .object({
    businessId: z.string().uuid(),
    serviceId: z.string().uuid(),
    staffId: z.string().uuid().optional(),
    resourceId: z.string().uuid().optional(),
    appointmentDate: z.string().date(),
    startTime: z.string().regex(timeRegex, 'Invalid time format. Use HH:mm or HH:mm:ss'),
    endTime: z.string().regex(timeRegex, 'Invalid time format. Use HH:mm or HH:mm:ss'),
  })
  .refine((data) => isEndAfterStart(data.startTime, data.endTime), {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

export const updateAppointmentSchema = z
  .object({
    staffId: z.string().uuid().nullable().optional(),
    resourceId: z.string().uuid().nullable().optional(),
    appointmentDate: z.string().date().optional(),
    startTime: z.string().regex(timeRegex).optional(),
    endTime: z.string().regex(timeRegex).optional(),
    status: z.nativeEnum(AppointmentStatus).optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return isEndAfterStart(data.startTime, data.endTime);
      }
      return true;
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  );

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
