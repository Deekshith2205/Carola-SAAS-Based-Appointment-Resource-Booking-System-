import { z } from 'zod';

export const createServiceSchema = z.object({
  businessId: z.string().uuid(),
  serviceName: z.string().trim().min(2).max(150),
  durationMinutes: z.coerce.number().int().min(5).max(480),
  price: z.coerce.number().min(0),
  description: z.string().trim().max(1000).optional(),
});

export const updateServiceSchema = createServiceSchema.omit({ businessId: true }).partial();

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
