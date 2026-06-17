import { z } from 'zod';

export const dashboardBaseQuerySchema = z.object({
  businessId: z.string().uuid(),
});

export const dateRangeQuerySchema = dashboardBaseQuerySchema.extend({
  startDate: z.string().date('Invalid start date. Use YYYY-MM-DD').optional(),
  endDate: z.string().date('Invalid end date. Use YYYY-MM-DD').optional(),
});

export const revenueTrendQuerySchema = dateRangeQuerySchema.extend({
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
});

export const popularServicesQuerySchema = dashboardBaseQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(50).default(5),
});

export type DashboardBaseQuery = z.infer<typeof dashboardBaseQuerySchema>;
export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;
export type RevenueTrendQuery = z.infer<typeof revenueTrendQuerySchema>;
export type PopularServicesQuery = z.infer<typeof popularServicesQuerySchema>;
