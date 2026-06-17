import { AppointmentStatus, UserRole } from '@prisma/client';
import { prisma } from '../prisma/client';
import { AppError } from '../utils/AppError';
import { parseAppointmentDate, toTimeDate } from '../utils/dateTime';
import { paginateQuery, PaginationParams } from '../utils/pagination';
import {
  BookingContext,
  runSerializableTransaction,
  validateAppointmentBooking,
} from './appointmentBooking.validator';
import { dispatchAppointmentEvent } from './notificationDispatcher';
import type { CreateAppointmentInput, UpdateAppointmentInput } from '../validations/appointment.validation';

// ---------------------------------------------------------------------------
// Shared Prisma include shape
// ---------------------------------------------------------------------------

const appointmentInclude = {
  customer: {
    select: { id: true, name: true, email: true },
  },
  business: {
    select: { id: true, businessName: true, ownerId: true },
  },
  service: true,
  staff: {
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  },
  resource: true,
} as const;

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

// Legacy notification helpers removed in favor of dispatchAppointmentEvent

// ---------------------------------------------------------------------------
// Create Appointment
// ---------------------------------------------------------------------------

export async function createAppointment(customerId: string, input: CreateAppointmentInput) {
  const appointmentDate = parseAppointmentDate(input.appointmentDate);
  const startTime = toTimeDate(input.startTime);
  const endTime = toTimeDate(input.endTime);

  const ctx: BookingContext = {
    customerId,
    businessId: input.businessId,
    serviceId: input.serviceId,
    staffId: input.staffId ?? null,
    resourceId: input.resourceId ?? null,
    appointmentDate,
    startTime,
    endTime,
  };

  const appointment = await runSerializableTransaction(async (tx) => {
    // Run all validations (existence + conflict) in a single aggregated pass
    await validateAppointmentBooking(tx, ctx);

    const appointment = await tx.appointment.create({
      data: {
        customerId,
        businessId: input.businessId,
        serviceId: input.serviceId,
        staffId: input.staffId ?? null,
        resourceId: input.resourceId ?? null,
        appointmentDate,
        startTime,
        endTime,
      },
      include: appointmentInclude,
    });

    return appointment;
  });

  // Send notifications outside the transaction
  await dispatchAppointmentEvent(appointment.id, 'APPOINTMENT_CREATED' as any);

  return appointment;
}

// ---------------------------------------------------------------------------
// Get Appointment By ID (with role-based access guard)
// ---------------------------------------------------------------------------

export async function getAppointmentById(
  appointmentId: string,
  userId: string,
  role: UserRole
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: appointmentInclude,
  });

  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  let canView =
    role === UserRole.SUPER_ADMIN ||
    appointment.customerId === userId ||
    appointment.business.ownerId === userId;

  if (!canView && role === UserRole.STAFF && appointment.staffId) {
    const staffProfile = await prisma.staff.findFirst({
      where: {
        userId,
        id: appointment.staffId,
        businessId: appointment.businessId,
      },
    });
    canView = Boolean(staffProfile);
  }

  if (!canView) {
    throw new AppError('Insufficient permissions', 403);
  }

  return appointment;
}

// ---------------------------------------------------------------------------
// List Appointments (role-scoped)
// ---------------------------------------------------------------------------

export async function listAppointments(
  userId: string,
  role: UserRole,
  pagination: PaginationParams,
  businessId?: string
) {
  const orderBy = [{ appointmentDate: 'desc' as const }, { startTime: 'asc' as const }];

  if (role === UserRole.CUSTOMER) {
    const where = { customerId: userId };
    return paginateQuery(
      () => prisma.appointment.count({ where }),
      (skip, take) => prisma.appointment.findMany({ where, include: appointmentInclude, orderBy, skip, take }),
      pagination
    );
  }

  if (role === UserRole.BUSINESS_OWNER) {
    const where = {
      business: { ownerId: userId },
      ...(businessId ? { businessId } : {}),
    };
    return paginateQuery(
      () => prisma.appointment.count({ where }),
      (skip, take) => prisma.appointment.findMany({ where, include: appointmentInclude, orderBy, skip, take }),
      pagination
    );
  }

  if (role === UserRole.STAFF) {
    const where = {
      staff: { userId },
      ...(businessId ? { businessId } : {}),
    };
    return paginateQuery(
      () => prisma.appointment.count({ where }),
      (skip, take) => prisma.appointment.findMany({ where, include: appointmentInclude, orderBy, skip, take }),
      pagination
    );
  }

  // SUPER_ADMIN: unrestricted access
  const where = businessId ? { businessId } : {};
  return paginateQuery(
    () => prisma.appointment.count({ where }),
    (skip, take) => prisma.appointment.findMany({ where, include: appointmentInclude, orderBy, skip, take }),
    pagination
  );
}

// ---------------------------------------------------------------------------
// Update Appointment
// ---------------------------------------------------------------------------

export async function updateAppointment(
  appointmentId: string,
  userId: string,
  role: UserRole,
  input: UpdateAppointmentInput
) {
  const existing = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { business: true, service: true },
  });

  if (!existing) {
    throw new AppError('Appointment not found', 404);
  }

  const canUpdate =
    role === UserRole.SUPER_ADMIN ||
    existing.customerId === userId ||
    existing.business.ownerId === userId;

  if (!canUpdate) {
    throw new AppError('Insufficient permissions', 403);
  }

  // Determine new values (fall back to existing values when not provided)
  const newAppointmentDate = input.appointmentDate
    ? parseAppointmentDate(input.appointmentDate)
    : existing.appointmentDate;
  const newStartTime = input.startTime ? toTimeDate(input.startTime) : existing.startTime;
  const newEndTime = input.endTime ? toTimeDate(input.endTime) : existing.endTime;
  const newStaffId = input.staffId !== undefined ? input.staffId : existing.staffId;
  const newResourceId = input.resourceId !== undefined ? input.resourceId : existing.resourceId;

  const scheduleChanged =
    input.appointmentDate !== undefined ||
    input.startTime !== undefined ||
    input.endTime !== undefined ||
    input.staffId !== undefined ||
    input.resourceId !== undefined;

  if (scheduleChanged) {
    const ctx: BookingContext = {
      customerId: existing.customerId,
      businessId: existing.businessId,
      serviceId: existing.serviceId,
      staffId: newStaffId,
      resourceId: newResourceId,
      appointmentDate: newAppointmentDate,
      startTime: newStartTime,
      endTime: newEndTime,
      excludeAppointmentId: appointmentId,
    };

    const appointment = await runSerializableTransaction(async (tx) => {
      // Re-validate with full conflict detection on updated slot
      await validateAppointmentBooking(tx, ctx);

      const appointment = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          staffId: newStaffId,
          resourceId: newResourceId,
          appointmentDate: newAppointmentDate,
          startTime: newStartTime,
          endTime: newEndTime,
          status: input.status,
        },
        include: appointmentInclude,
      });

      return appointment;
    });

    // Only notify if status changed
    if (input.status === 'CONFIRMED') {
      await dispatchAppointmentEvent(appointmentId, 'APPOINTMENT_CONFIRMED' as any);
    } else if (input.status === 'CANCELLED') {
      await dispatchAppointmentEvent(appointmentId, 'APPOINTMENT_CANCELLED' as any);
    } else {
      await dispatchAppointmentEvent(appointmentId, 'SYSTEM' as any);
    }

    return appointment;
  }

  // Status-only update — no re-validation needed
  const appointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: input.status },
    include: appointmentInclude,
  });

  if (input.status === 'CONFIRMED' && existing.status !== 'CONFIRMED') {
    await dispatchAppointmentEvent(appointmentId, 'APPOINTMENT_CONFIRMED' as any);
  } else if (input.status === 'CANCELLED' && existing.status !== 'CANCELLED') {
    await dispatchAppointmentEvent(appointmentId, 'APPOINTMENT_CANCELLED' as any);
  } else if (input.status && input.status !== existing.status) {
    await dispatchAppointmentEvent(appointmentId, 'SYSTEM' as any);
  }

  return appointment;
}

// ---------------------------------------------------------------------------
// Cancel Appointment
// ---------------------------------------------------------------------------

export async function cancelAppointment(
  appointmentId: string,
  userId: string,
  role: UserRole
) {
  return updateAppointment(appointmentId, userId, role, {
    status: AppointmentStatus.CANCELLED,
  });
}
