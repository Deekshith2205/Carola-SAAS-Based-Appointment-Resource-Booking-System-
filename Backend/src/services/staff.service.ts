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
    select: { id: true, name: true, email: true, role: true, phone: true },
  },
  business: {
    select: { id: true, businessName: true },
  },
  services: {
    select: { id: true, serviceName: true },
  },
  availability: {
    include: {
      breaks: true,
    },
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
        phone: input.phone,
      },
    });
  } else {
    if (input.phone) {
      await prisma.user.update({
        where: { id: user.id },
        data: { phone: input.phone },
      });
    }
  }

  // Handle nested serviceIds
  const servicesConnect = input.serviceIds ? input.serviceIds.map(id => ({ id })) : [];

  const staff = await prisma.staff.create({
    data: {
      businessId: input.businessId,
      userId: user.id,
      designation: input.designation,
      department: input.department,
      yearsOfExperience: input.yearsOfExperience,
      bio: input.bio,
      certifications: input.certifications || [],
      specializations: input.specializations || [],
      availabilityStatus: input.availabilityStatus,
      services: {
        connect: servicesConnect,
      },
    },
    include: staffInclude,
  });

  // Handle working hours
  if (input.workingHours && input.workingHours.length > 0) {
    for (const wh of input.workingHours) {
      // time strings come as HH:mm, need to convert to valid DateTime for Prisma Postgres Time(0)
      const baseDate = new Date().toISOString().split('T')[0];
      const startTime = new Date(`${baseDate}T${wh.startTime}:00Z`);
      const endTime = new Date(`${baseDate}T${wh.endTime}:00Z`);

      const createdAvailability = await prisma.staffAvailability.create({
        data: {
          staffId: staff.id,
          dayOfWeek: wh.dayOfWeek,
          startTime: startTime,
          endTime: endTime,
          isActive: wh.isActive,
        }
      });

      if (wh.breaks && wh.breaks.length > 0) {
        for (const b of wh.breaks) {
          await prisma.staffBreak.create({
            data: {
              availabilityId: createdAvailability.id,
              name: b.name,
              startTime: new Date(`${baseDate}T${b.startTime}:00Z`),
              endTime: new Date(`${baseDate}T${b.endTime}:00Z`),
            }
          });
        }
      }
    }
  }

  return prisma.staff.findUnique({
    where: { id: staff.id },
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
    include: { user: true },
  });

  if (!staff) {
    throw new AppError('Staff member not found', 404);
  }

  await assertCanManageBusiness(staff.businessId, userId, role);

  if (input.phone || input.name) {
    await prisma.user.update({
      where: { id: staff.userId },
      data: {
        ...(input.phone && { phone: input.phone }),
        ...(input.name && { name: input.name }),
      },
    });
  }

  const updateData: any = {
    designation: input.designation,
    department: input.department,
    yearsOfExperience: input.yearsOfExperience,
    bio: input.bio,
    certifications: input.certifications,
    specializations: input.specializations,
    availabilityStatus: input.availabilityStatus,
  };

  if (input.serviceIds) {
    updateData.services = {
      set: input.serviceIds.map(id => ({ id }))
    };
  }

  await prisma.staff.update({
    where: { id: staffId },
    data: updateData,
    include: staffInclude,
  });

  if (input.workingHours) {
    // Delete existing availability and breaks
    await prisma.staffAvailability.deleteMany({
      where: { staffId: staffId },
    });

    for (const wh of input.workingHours) {
      const baseDate = new Date().toISOString().split('T')[0];
      const startTime = new Date(`${baseDate}T${wh.startTime}:00Z`);
      const endTime = new Date(`${baseDate}T${wh.endTime}:00Z`);

      const createdAvailability = await prisma.staffAvailability.create({
        data: {
          staffId: staffId,
          dayOfWeek: wh.dayOfWeek,
          startTime: startTime,
          endTime: endTime,
          isActive: wh.isActive,
        }
      });

      if (wh.breaks && wh.breaks.length > 0) {
        for (const b of wh.breaks) {
          await prisma.staffBreak.create({
            data: {
              availabilityId: createdAvailability.id,
              name: b.name,
              startTime: new Date(`${baseDate}T${b.startTime}:00Z`),
              endTime: new Date(`${baseDate}T${b.endTime}:00Z`),
            }
          });
        }
      }
    }
  }

  return prisma.staff.findUnique({
    where: { id: staffId },
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
