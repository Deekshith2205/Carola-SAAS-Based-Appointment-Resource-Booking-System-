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

// Accepts YYYY-MM-DD (z.string().date()) OR an ISO-8601 datetime string.
// We normalise to YYYY-MM-DD in the service layer.
const flexibleDateString = z
  .string()
  .refine(
    (v) => /^\d{4}-\d{2}-\d{2}/.test(v),
    { message: 'Date must start with YYYY-MM-DD' }
  )
  .transform((v) => v.slice(0, 10)); // always normalise to YYYY-MM-DD

export const updateAppointmentSchema = z
  .object({
    staffId: z.string().uuid().nullable().optional(),
    resourceId: z.string().uuid().nullable().optional(),
    appointmentDate: flexibleDateString.optional(),
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

// ── Status-only update schema ────────────────────────────────────────────────
// Used exclusively by PATCH /appointments/:id/status so that status updates
// are never blocked by date/time validation failures.
export const updateAppointmentStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus, {
    errorMap: () => ({ message: `Invalid status. Allowed values: ${Object.values(AppointmentStatus).join(', ')}` }),
  }),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;

export const appointmentSlotQuerySchema = z.object({
  businessId: z.string().uuid(),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid().optional(),
  date: z.string().date(),
});

export type AppointmentSlotQuery = z.infer<typeof appointmentSlotQuerySchema>;
