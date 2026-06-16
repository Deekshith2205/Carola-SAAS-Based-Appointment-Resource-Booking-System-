import { z } from 'zod';
import { ResourceStatus, ResourceType } from '@prisma/client';

export const createResourceSchema = z.object({
  businessId: z.string().uuid(),
  resourceName: z.string().trim().min(2).max(150),
  resourceType: z.nativeEnum(ResourceType),
  status: z.nativeEnum(ResourceStatus).optional(),
});

export const updateResourceSchema = z.object({
  resourceName: z.string().trim().min(2).max(150).optional(),
  resourceType: z.nativeEnum(ResourceType).optional(),
  status: z.nativeEnum(ResourceStatus).optional(),
});

export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
