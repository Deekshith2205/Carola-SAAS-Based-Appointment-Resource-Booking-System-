import { SubscriptionStatus } from '@prisma/client';
import { prisma } from '../prisma/client';
import { AppError } from '../utils/AppError';
import { PaginationQuery } from '../validations/common.validation';

export const listAllBusinesses = async (pagination: PaginationQuery) => {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const [businesses, total] = await Promise.all([
    prisma.business.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.business.count(),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    items: businesses,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};

export const updateBusinessStatus = async (
  businessId: string,
  status: SubscriptionStatus
) => {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  });

  if (!business) {
    throw new AppError('Business not found', 404);
  }

  return prisma.business.update({
    where: { id: businessId },
    data: { subscriptionStatus: status },
  });
};

export const getPlatformStatistics = async () => {
  const [totalUsers, totalBusinesses, totalResources, totalBookings] =
    await Promise.all([
      prisma.user.count(),
      prisma.business.count(),
      prisma.resource.count(),
      prisma.appointment.count(),
    ]);

  return {
    totalUsers,
    totalBusinesses,
    totalResources,
    totalBookings,
  };
};
