import { UserRole } from '@prisma/client';
import { prisma } from '../prisma/client';
import { AppError } from '../utils/AppError';
import { assertCanManageBusiness } from './businessAccess.service';
import { paginateQuery, PaginationParams } from '../utils/pagination';
import { hashPassword } from '../utils/password';
import crypto from 'crypto';
import type { CreateStaffInput, UpdateStaffInput } from '../validations/staff.validation';

const staffInclude = {
  user: {
    select: { id: true, name: true, email: true, role: true },
  },
  business: {
    select: { id: true, businessName: true },
  },
} as const;

export async function createStaff(userId: string, role: UserRole, input: CreateStaffInput) {
  await assertCanManageBusiness(input.businessId, userId, role);

  let user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    const rawPassword = crypto.randomBytes(16).toString('hex') + 'A1!'; // ensure it passes strong regex if needed
    const hashedPassword = await hashPassword(rawPassword);
    
    user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        password: hashedPassword,
        role: 'STAFF',
      },
    });
  }

  return prisma.staff.create({
    data: {
      businessId: input.businessId,
      userId: user.id,
      designation: input.designation,
      availabilityStatus: input.availabilityStatus,
    },
    include: staffInclude,
  });
}

export async function listStaffByBusiness(businessId: string, pagination: PaginationParams) {
  const where = { businessId };

  return paginateQuery(
    () => prisma.staff.count({ where }),
    (skip, take) =>
      prisma.staff.findMany({
        where,
        include: staffInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    pagination
  );
}

export async function updateStaff(
  staffId: string,
  userId: string,
  role: UserRole,
  input: UpdateStaffInput
) {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
  });

  if (!staff) {
    throw new AppError('Staff member not found', 404);
  }

  await assertCanManageBusiness(staff.businessId, userId, role);

  return prisma.staff.update({
    where: { id: staffId },
    data: input,
    include: staffInclude,
  });
}

export async function deleteStaff(staffId: string, userId: string, role: UserRole) {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
  });

  if (!staff) {
    throw new AppError('Staff member not found', 404);
  }

  await assertCanManageBusiness(staff.businessId, userId, role);

  await prisma.staff.delete({
    where: { id: staffId },
  });
}
