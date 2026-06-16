import { LeaveStatus, UserRole } from '@prisma/client';
import { prisma } from '../prisma/client';
import { AppError } from '../utils/AppError';
import { assertCanManageBusiness } from './businessAccess.service';
import { paginateQuery, PaginationParams } from '../utils/pagination';
import { parseAppointmentDate } from '../utils/dateTime';
import type {
  CreateLeaveInput,
  UpdateLeaveStatusInput,
  LeaveListQuery,
} from '../validations/staffLeave.validation';

// ---------------------------------------------------------------------------
// Resolve staff ownership — staff member can manage their own leave;
// business owner / super admin can approve/reject.
// ---------------------------------------------------------------------------

async function resolveStaff(staffId: string) {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { id: true, userId: true, businessId: true },
  });

  if (!staff) throw new AppError('Staff member not found', 404);

  return staff;
}

// ---------------------------------------------------------------------------
// Request leave (staff member or owner/admin on behalf)
// ---------------------------------------------------------------------------

export async function requestLeave(
  requesterId: string,
  requesterRole: UserRole,
  input: CreateLeaveInput
) {
  const staff = await resolveStaff(input.staffId);

  // Staff can only request leave for themselves; owner/admin can for any staff
  if (requesterRole === UserRole.STAFF && staff.userId !== requesterId) {
    throw new AppError('Staff members can only request leave for themselves', 403);
  }

  if (requesterRole === UserRole.BUSINESS_OWNER) {
    await assertCanManageBusiness(staff.businessId, requesterId, requesterRole);
  }

  const leaveDate = parseAppointmentDate(input.leaveDate);

  // Prevent duplicate leave requests for the same date
  const existing = await prisma.staffLeave.findUnique({
    where: { staffId_leaveDate: { staffId: input.staffId, leaveDate } },
    select: { id: true, status: true },
  });

  if (existing && existing.status !== LeaveStatus.REJECTED && existing.status !== LeaveStatus.CANCELLED) {
    throw new AppError(
      `A leave request already exists for ${input.leaveDate} with status "${existing.status}"`,
      409
    );
  }

  // Upsert — allow re-requesting after rejection/cancellation
  return prisma.staffLeave.upsert({
    where: { staffId_leaveDate: { staffId: input.staffId, leaveDate } },
    create: {
      staffId:   input.staffId,
      leaveDate,
      reason:    input.reason,
      status:    LeaveStatus.PENDING,
    },
    update: {
      reason:     input.reason,
      status:     LeaveStatus.PENDING,
      reviewedBy: null,
      reviewedAt: null,
    },
    include: { staff: { select: { user: { select: { name: true } } } } },
  });
}

// ---------------------------------------------------------------------------
// List leave requests (scoped by role)
// ---------------------------------------------------------------------------

export async function listLeaves(
  userId: string,
  role: UserRole,
  query: LeaveListQuery,
  pagination: PaginationParams
) {
  const { businessId, staffId, status } = query;

  let baseWhere: Record<string, any> = {
    ...(status ? { status } : {}),
  };

  if (role === UserRole.STAFF) {
    // Staff only sees their own leave requests
    const staffProfiles = await prisma.staff.findMany({
      where: { userId },
      select: { id: true },
    });
    const staffIds = staffProfiles.map((s) => s.id);
    baseWhere = { ...baseWhere, staffId: { in: staffIds } };
  } else if (role === UserRole.BUSINESS_OWNER) {
    // Business owner sees leave for their businesses
    baseWhere = {
      ...baseWhere,
      staff: { business: { ownerId: userId } },
      ...(businessId ? { staff: { businessId } } : {}),
      ...(staffId ? { staffId } : {}),
    };
  } else if (role === UserRole.SUPER_ADMIN) {
    if (businessId) baseWhere = { ...baseWhere, staff: { businessId } };
    if (staffId)    baseWhere = { ...baseWhere, staffId };
  }

  const include = {
    staff: {
      include: {
        user:     { select: { id: true, name: true, email: true } },
        business: { select: { id: true, businessName: true } },
      },
    },
    reviewer: { select: { id: true, name: true } },
  } as const;

  return paginateQuery(
    () => prisma.staffLeave.count({ where: baseWhere }),
    (skip, take) =>
      prisma.staffLeave.findMany({
        where: baseWhere,
        include,
        orderBy: [{ leaveDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
    pagination
  );
}

// ---------------------------------------------------------------------------
// Update leave status (APPROVED | REJECTED | CANCELLED)
// ---------------------------------------------------------------------------

export async function updateLeaveStatus(
  leaveId: string,
  reviewerId: string,
  reviewerRole: UserRole,
  input: UpdateLeaveStatusInput
) {
  const leave = await prisma.staffLeave.findUnique({
    where: { id: leaveId },
    include: { staff: { select: { userId: true, businessId: true } } },
  });

  if (!leave) throw new AppError('Leave request not found', 404);

  // Staff can only CANCEL their own pending leave
  if (reviewerRole === UserRole.STAFF) {
    if (leave.staff.userId !== reviewerId) {
      throw new AppError('Staff members can only manage their own leave', 403);
    }

    if (input.status !== LeaveStatus.CANCELLED) {
      throw new AppError('Staff members can only cancel leave requests', 403);
    }

    if (leave.status !== LeaveStatus.PENDING) {
      throw new AppError(
        `Cannot cancel a leave request with status "${leave.status}"`,
        409
      );
    }
  } else {
    // Business owner / super admin
    if (reviewerRole === UserRole.BUSINESS_OWNER) {
      await assertCanManageBusiness(leave.staff.businessId, reviewerId, reviewerRole);
    }

    if (leave.status !== LeaveStatus.PENDING) {
      throw new AppError(
        `Cannot review a leave request with status "${leave.status}"`,
        409
      );
    }
  }

  return prisma.staffLeave.update({
    where: { id: leaveId },
    data: {
      status:     input.status,
      reviewedBy: reviewerRole !== UserRole.STAFF ? reviewerId : undefined,
      reviewedAt: reviewerRole !== UserRole.STAFF ? new Date() : undefined,
    },
    include: {
      staff:    { include: { user: { select: { id: true, name: true } } } },
      reviewer: { select: { id: true, name: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// Get a single leave request by ID
// ---------------------------------------------------------------------------

export async function getLeaveById(leaveId: string, userId: string, role: UserRole) {
  const leave = await prisma.staffLeave.findUnique({
    where: { id: leaveId },
    include: {
      staff: {
        include: {
          user:     { select: { id: true, name: true, email: true } },
          business: { select: { id: true, businessName: true, ownerId: true } },
        },
      },
      reviewer: { select: { id: true, name: true } },
    },
  });

  if (!leave) throw new AppError('Leave request not found', 404);

  const canAccess =
    role === UserRole.SUPER_ADMIN ||
    leave.staff.business.ownerId === userId ||
    leave.staff.userId === userId;

  if (!canAccess) throw new AppError('Insufficient permissions', 403);

  return leave;
}
