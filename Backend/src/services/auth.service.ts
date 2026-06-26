import { UserRole } from '@prisma/client';
import { prisma } from '../prisma/client';
import { AppError } from '../utils/AppError';
import { comparePassword, hashPassword } from '../utils/password';
import { signToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import type { LoginInput, RegisterInput, UpdateProfileInput, ChangePasswordInput } from '../validations/auth.validation';

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

  if (role === UserRole.BUSINESS_OWNER) {
    await prisma.business.create({
      data: {
        ownerId: user.id,
        businessName: `${user.name}'s Business`,
        businessType: 'General',
      },
    });
  }

  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  const refreshToken = signRefreshToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt,
    },
  });

  return { user, token, refreshToken };
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

  const refreshToken = signRefreshToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt,
    },
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
    refreshToken,
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

export async function refreshUserToken(tokenStr: string) {
  // 1. Verify token mathematically
  const decoded = verifyRefreshToken(tokenStr);

  // 2. Verify token in DB
  const existingToken = await prisma.refreshToken.findUnique({
    where: { token: tokenStr },
  });

  if (!existingToken) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  if (existingToken.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: existingToken.id } });
    throw new AppError('Refresh token expired', 401);
  }

  // 3. Issue new tokens
  const newAccessToken = signToken({
    sub: decoded.sub,
    email: decoded.email,
    role: decoded.role,
  });

  const newRefreshToken = signRefreshToken({
    sub: decoded.sub,
    email: decoded.email,
    role: decoded.role,
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Replace old token with new one
  await prisma.$transaction([
    prisma.refreshToken.delete({ where: { id: existingToken.id } }),
    prisma.refreshToken.create({
      data: {
        userId: decoded.sub,
        token: newRefreshToken,
        expiresAt,
      },
    }),
  ]);

  return { token: newAccessToken, refreshToken: newRefreshToken };
}

export async function updateUserProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Build update payload — only the fields provided in the (already .strict()-validated) input
  const data: { name?: string } = {};
  if (input.name !== undefined) data.name = input.name;

  // Nothing to update — return existing profile unchanged
  if (Object.keys(data).length === 0) {
    const existing = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
    if (!existing) throw new AppError('User not found', 404);
    return existing;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: publicUserSelect,
  });

  return updated;
}

export async function changeUserPassword(userId: string, input: ChangePasswordInput) {
  // 1. Fetch current user WITH the hashed password
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);

  // 2. Verify the supplied current password
  const isMatch = await comparePassword(input.currentPassword, user.password);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 400);
  }

  // 3. Reject if the new password is identical to the current one
  const isSame = await comparePassword(input.newPassword, user.password);
  if (isSame) {
    throw new AppError('New password must be different from your current password', 400);
  }

  // 4. Hash and persist the new password
  const hashed = await hashPassword(input.newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });
}
