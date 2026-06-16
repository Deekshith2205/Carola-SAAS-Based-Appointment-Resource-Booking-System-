import { SubscriptionStatus, UserRole, ResourceStatus } from '@prisma/client';
import { prisma } from '../prisma/client';
import { AppError } from '../utils/AppError';
import { paginateQuery, PaginationParams } from '../utils/pagination';
import type { CreateBusinessInput, UpdateBusinessInput } from '../validations/business.validation';

const publicBusinessSelect = {
  id: true,
  businessName: true,
  businessType: true,
  phone: true,
  email: true,
  address: true,
  subscriptionStatus: true,
  createdAt: true,
} as const;

export async function listPublicBusinesses(pagination: PaginationParams) {
  const where = {
    subscriptionStatus: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
  };

  return paginateQuery(
    () => prisma.business.count({ where }),
    (skip, take) =>
      prisma.business.findMany({
        where,
        select: publicBusinessSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    pagination
  );
}

export async function getPublicBusinessById(businessId: string) {
  const business = await prisma.business.findFirst({
    where: {
      id: businessId,
      subscriptionStatus: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
    },
    include: {
      services: true,
      resources: {
        where: { status: { not: ResourceStatus.UNAVAILABLE } },
      },
      staff: {
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      },
    },
  });

  if (!business) {
    throw new AppError('Business not found', 404);
  }

  return business;
}

export async function createBusiness(ownerId: string, input: CreateBusinessInput) {
  return prisma.business.create({
    data: {
      ownerId,
      ...input,
    },
  });
}

export async function listBusinesses(
  userId: string,
  role: UserRole,
  pagination: PaginationParams
) {
  if (role === UserRole.SUPER_ADMIN) {
    return paginateQuery(
      () => prisma.business.count(),
      (skip, take) =>
        prisma.business.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
      pagination
    );
  }

  if (role === UserRole.BUSINESS_OWNER) {
    const where = { ownerId: userId };

    return paginateQuery(
      () => prisma.business.count({ where }),
      (skip, take) =>
        prisma.business.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
      pagination
    );
  }

  if (role === UserRole.STAFF) {
    const where = {
      staff: {
        some: { userId },
      },
    };

    return paginateQuery(
      () => prisma.business.count({ where }),
      (skip, take) =>
        prisma.business.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
      pagination
    );
  }

  const where = {
    subscriptionStatus: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
  };

  return paginateQuery(
    () => prisma.business.count({ where }),
    (skip, take) =>
      prisma.business.findMany({
        where,
        select: publicBusinessSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    pagination
  );
}

export async function getBusinessById(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      services: true,
      resources: true,
      staff: {
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      },
    },
  });

  if (!business) {
    throw new AppError('Business not found', 404);
  }

  return business;
}

export async function updateBusiness(businessId: string, input: UpdateBusinessInput) {
  await getBusinessById(businessId);

  return prisma.business.update({
    where: { id: businessId },
    data: input,
  });
}
