import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

export const businessIdParamSchema = z.object({
  businessId: z.string().uuid(),
});

export const notificationListQuerySchema = paginationQuerySchema.extend({
  unreadOnly: z.enum(['true', 'false']).optional(),
});

export const appointmentListQuerySchema = paginationQuerySchema.extend({
  businessId: z.string().uuid().optional(),
});

export const businessListQuerySchema = paginationQuerySchema;

export const businessScopedListQuerySchema = paginationQuerySchema;

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type BusinessListQuery = z.infer<typeof businessListQuerySchema>;
export type BusinessScopedListQuery = z.infer<typeof businessScopedListQuerySchema>;
export type AppointmentListQuery = z.infer<typeof appointmentListQuerySchema>;
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;
export type UuidParam = z.infer<typeof uuidParamSchema>;
export type BusinessIdParam = z.infer<typeof businessIdParamSchema>;
