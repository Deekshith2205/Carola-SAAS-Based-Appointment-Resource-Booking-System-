import { UserRole } from '@prisma/client';
import { prisma } from '../prisma/client';
import { AppError } from '../utils/AppError';
import { assertCanManageBusiness } from './businessAccess.service';
import { paginateQuery, PaginationParams } from '../utils/pagination';
import type { CreateResourceInput, UpdateResourceInput } from '../validations/resource.validation';

export async function createResource(userId: string, role: UserRole, input: CreateResourceInput) {
  await assertCanManageBusiness(input.businessId, userId, role);

  return prisma.resource.create({
    data: {
      businessId: input.businessId,
      resourceName: input.resourceName,
      resourceType: input.resourceType,
      status: input.status,
    },
  });
}

export async function listResourcesByBusiness(businessId: string, pagination: PaginationParams) {
  const where = { businessId };

  return paginateQuery(
    () => prisma.resource.count({ where }),
    (skip, take) =>
      prisma.resource.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    pagination
  );
}

export async function updateResource(
  resourceId: string,
  userId: string,
  role: UserRole,
  input: UpdateResourceInput
) {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
  });

  if (!resource) {
    throw new AppError('Resource not found', 404);
  }

  await assertCanManageBusiness(resource.businessId, userId, role);

  return prisma.resource.update({
    where: { id: resourceId },
    data: input,
  });
}

export async function deleteResource(resourceId: string, userId: string, role: UserRole) {
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
  });

  if (!resource) {
    throw new AppError('Resource not found', 404);
  }

  await assertCanManageBusiness(resource.businessId, userId, role);

  await prisma.resource.delete({
    where: { id: resourceId },
  });
}
