import { UserRole } from '@prisma/client';
import { prisma } from '../prisma/client';
import { AppError } from '../utils/AppError';
import { assertCanManageBusiness } from './businessAccess.service';
import { paginateQuery, PaginationParams } from '../utils/pagination';
import type { CreateServiceInput, UpdateServiceInput } from '../validations/service.validation';

export async function createService(userId: string, role: UserRole, input: CreateServiceInput) {
  await assertCanManageBusiness(input.businessId, userId, role);

  return prisma.service.create({
    data: {
      businessId: input.businessId,
      serviceName: input.serviceName,
      durationMinutes: input.durationMinutes,
      price: input.price,
      description: input.description,
    },
  });
}

export async function listServicesByBusiness(businessId: string, pagination: PaginationParams) {
  const where = { businessId };

  return paginateQuery(
    () => prisma.service.count({ where }),
    (skip, take) =>
      prisma.service.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    pagination
  );
}

export async function updateService(
  serviceId: string,
  userId: string,
  role: UserRole,
  input: UpdateServiceInput
) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });

  if (!service) {
    throw new AppError('Service not found', 404);
  }

  await assertCanManageBusiness(service.businessId, userId, role);

  return prisma.service.update({
    where: { id: serviceId },
    data: input,
  });
}

export async function deleteService(serviceId: string, userId: string, role: UserRole) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });

  if (!service) {
    throw new AppError('Service not found', 404);
  }

  await assertCanManageBusiness(service.businessId, userId, role);

  await prisma.service.delete({
    where: { id: serviceId },
  });
}
