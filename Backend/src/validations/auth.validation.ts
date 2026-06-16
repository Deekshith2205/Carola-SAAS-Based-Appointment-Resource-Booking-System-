import { z } from 'zod';
import { UserRole } from '@prisma/client';

const registerableRoles = [
  UserRole.CUSTOMER,
  UserRole.BUSINESS_OWNER,
  UserRole.STAFF,
] as const;

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z
    .enum(registerableRoles)
    .optional()
    .default(UserRole.CUSTOMER),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
