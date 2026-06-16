import { UserRole } from '@prisma/client';
import { prisma } from '../prisma/client';
import { AppError } from '../utils/AppError';

export async function assertBusinessOwner(businessId: string, userId: string) {
  const business = await prisma.business.findFirst({
    where: { id: businessId, ownerId: userId },
  });

  if (!business) {
    throw new AppError('Business not found or access denied', 403);
  }

  return business;
}

export async function assertCanManageBusiness(
  businessId: string,
  userId: string,
  role: UserRole
) {
  if (role === UserRole.SUPER_ADMIN) {
    const business = await prisma.business.findUnique({ where: { id: businessId } });

    if (!business) {
      throw new AppError('Business not found', 404);
    }

    return business;
  }

  return assertBusinessOwner(businessId, userId);
}
