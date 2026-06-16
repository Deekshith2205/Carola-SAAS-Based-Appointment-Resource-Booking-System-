import { z } from 'zod';
import { SubscriptionStatus } from '@prisma/client';

export const createBusinessSchema = z.object({
  businessName: z.string().trim().min(2).max(150),
  businessType: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().email().max(255).optional(),
  address: z.string().trim().max(500).optional(),
});

export const updateBusinessSchema = createBusinessSchema.partial().extend({
  subscriptionStatus: z.nativeEnum(SubscriptionStatus).optional(),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
