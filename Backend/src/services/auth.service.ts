import { UserRole } from '@prisma/client';
import { prisma } from '../prisma/client';
import { AppError } from '../utils/AppError';
import { comparePassword, hashPassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import type { LoginInput, RegisterInput } from '../validations/auth.validation';

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

function sanitizeRole(requestedRole: UserRole): UserRole {
  // SUPER_ADMIN cannot be self-assigned via public registration
  if (requestedRole === UserRole.SUPER_ADMIN) {
    return UserRole.CUSTOMER;
  }

  return requestedRole;
}

export async function registerUser(input: RegisterInput) {
  const role = sanitizeRole(input.role);

  const existingUser = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (existingUser) {
    throw new AppError('Email is already registered', 409);
  }

  const hashedPassword = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      password: hashedPassword,
      role,
    },
    select: publicUserSelect,
  });

  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  return { user, token };
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isValidPassword = await comparePassword(input.password, user.password);

  if (!isValidPassword) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    token,
  };
}

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: publicUserSelect,
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
}
