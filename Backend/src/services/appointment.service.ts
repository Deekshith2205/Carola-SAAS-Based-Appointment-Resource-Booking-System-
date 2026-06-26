import { AppointmentStatus, UserRole } from '@prisma/client';
import { prisma, basePrisma } from '../prisma/client';
import { AppError } from '../utils/AppError';
import { parseAppointmentDate, toTimeDate } from '../utils/dateTime';
import { paginateQuery, PaginationParams } from '../utils/pagination';
import {
  BookingContext,
  runSerializableTransaction,
  validateAppointmentBooking,
} from './appointmentBooking.validator';
import { dispatchAppointmentEvent } from './notificationDispatcher';
import type { CreateAppointmentInput, UpdateAppointmentInput, UpdateAppointmentStatusInput } from '../validations/appointment.validation';

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
  return updateAppointmentStatus(appointmentId, userId, role, { status: AppointmentStatus.CANCELLED });
}

// ---------------------------------------------------------------------------
// Update Appointment Status (dedicated, safe status-only update)
// ---------------------------------------------------------------------------

/**
 * Valid status transitions enforcing business rules.
 * Key   = current (from) status
 * Value = allowed target (to) statuses
 */
export const VALID_STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  [AppointmentStatus.PENDING]: [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.RESCHEDULED,
  ],
  [AppointmentStatus.CONFIRMED]: [
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
    AppointmentStatus.RESCHEDULED,
  ],
  [AppointmentStatus.RESCHEDULED]: [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.PENDING,
  ],
  // Terminal states — no outbound transitions allowed
  [AppointmentStatus.COMPLETED]:  [],
  [AppointmentStatus.CANCELLED]:  [],
  [AppointmentStatus.NO_SHOW]:    [],
};

export async function updateAppointmentStatus(
  appointmentId: string,
  userId: string,
  role: UserRole,
  input: UpdateAppointmentStatusInput
): Promise<typeof appointmentWithIncludes> {
  // ── 1. Fetch existing appointment using basePrisma to skip the extension ──
  // The extended prisma client transforms findUnique → findFirst with injected
  // tenant filters. We use basePrisma here so the look-up is always by raw ID
  // and the access check is handled explicitly below.
  const existing = await basePrisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { business: true },
  });

  if (!existing) {
    throw new AppError('Appointment not found.', 404);
  }

  // ── 2. Role-based ownership check ──────────────────────────────────────────
  const canUpdate =
    role === UserRole.SUPER_ADMIN ||
    existing.customerId === userId ||
    existing.business.ownerId === userId;

  if (!canUpdate) {
    // Also allow the assigned staff member to update status
    if (role === UserRole.STAFF) {
      const staffProfile = await basePrisma.staff.findFirst({
        where: { userId, id: existing.staffId ?? undefined, businessId: existing.businessId },
      });
      if (!staffProfile) {
        throw new AppError('You are not authorised to modify this appointment.', 403);
      }
    } else {
      throw new AppError('You are not authorised to modify this appointment.', 403);
    }
  }

  // ── 3. Business rule: terminal state guard ──────────────────────────────────
  const terminalStatuses: AppointmentStatus[] = [
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
  ];

  if (terminalStatuses.includes(existing.status)) {
    const labels: Record<AppointmentStatus, string> = {
      COMPLETED:   'completed',
      CANCELLED:   'cancelled',
      NO_SHOW:     'marked as no-show',
      PENDING:     'pending',
      CONFIRMED:   'confirmed',
      RESCHEDULED: 'rescheduled',
    };
    throw new AppError(
      `Appointment has already been ${labels[existing.status]} and cannot be changed.`,
      409
    );
  }

  // ── 4. Transition validation ────────────────────────────────────────────────
  const allowedTargets = VALID_STATUS_TRANSITIONS[existing.status] ?? [];
  if (!allowedTargets.includes(input.status)) {
    throw new AppError(
      `Invalid status transition: "${existing.status}" → "${input.status}". ` +
      `Allowed next statuses: ${allowedTargets.length ? allowedTargets.join(', ') : 'none (terminal state)'}.`,
      422
    );
  }

  // ── 5. Persist ──────────────────────────────────────────────────────────────
  // Use basePrisma.appointment.update directly — this bypasses the extension's
  // findFirst access-check (which we already did above) and avoids any
  // tenant-filter injection that could cause a spurious 403.
  const appointment = await basePrisma.appointment.update({
    where: { id: appointmentId },
    data: { status: input.status },
    include: appointmentInclude,
  });

  // ── 6. Dispatch notification ────────────────────────────────────────────────
  if (input.status === AppointmentStatus.CONFIRMED) {
    await dispatchAppointmentEvent(appointmentId, 'APPOINTMENT_CONFIRMED' as any);
  } else if (input.status === AppointmentStatus.CANCELLED) {
    await dispatchAppointmentEvent(appointmentId, 'APPOINTMENT_CANCELLED' as any);
  } else {
    await dispatchAppointmentEvent(appointmentId, 'SYSTEM' as any);
  }

  return appointment;
}

// Typed return helper — keeps the return type inferred from the include shape
const appointmentWithIncludes = {} as Awaited<ReturnType<typeof basePrisma.appointment.update<{
  where: { id: string };
  data: { status: AppointmentStatus };
  include: typeof appointmentInclude;
}>>>;


// ---------------------------------------------------------------------------
// Time Slot Generation
// ---------------------------------------------------------------------------

export async function getAvailableTimeSlots(
  businessId: string,
  serviceId: string,
  dateStr: string,
  staffId?: string
): Promise<string[]> {
  const appointmentDate = parseAppointmentDate(dateStr);
  const dow = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][appointmentDate.getUTCDay()];

  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId },
    select: { durationMinutes: true },
  });

  if (!service) {
    throw new AppError('Service not found', 404);
  }

  const duration = service.durationMinutes;

  // Find target staff
  let targetStaffIds: string[] = [];
  if (staffId) {
    targetStaffIds.push(staffId);
  } else {
    const staffList = await prisma.staff.findMany({
      where: {
        businessId,
        services: { some: { id: serviceId } },
        availabilityStatus: 'AVAILABLE'
      },
      select: { id: true }
    });
    targetStaffIds = staffList.map(s => s.id);
  }

  const validSlots = new Set<string>();

  for (const sId of targetStaffIds) {
    // Check if on leave
    const leave = await prisma.staffLeave.findFirst({
      where: { staffId: sId, leaveDate: appointmentDate, status: 'APPROVED' },
    });
    if (leave) continue;

    // Check availability for this day
    const avail = await prisma.staffAvailability.findFirst({
      where: { staffId: sId, dayOfWeek: dow as any, isActive: true },
      include: { breaks: true }
    });
    if (!avail) continue;

    // Fetch existing appointments
    const existingAppts = await prisma.appointment.findMany({
      where: {
        staffId: sId,
        appointmentDate,
        status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] }
      },
      select: { startTime: true, endTime: true }
    });

    const startMins = avail.startTime.getUTCHours() * 60 + avail.startTime.getUTCMinutes();
    const endMins = avail.endTime.getUTCHours() * 60 + avail.endTime.getUTCMinutes();

    // Generate slots
    for (let m = startMins; m <= endMins - duration; m += duration) {
      const slotStart = m;
      const slotEnd = m + duration;

      // Check break overlap
      const overlapsBreak = avail.breaks.some(b => {
        const bStart = b.startTime.getUTCHours() * 60 + b.startTime.getUTCMinutes();
        const bEnd = b.endTime.getUTCHours() * 60 + b.endTime.getUTCMinutes();
        return slotStart < bEnd && bStart < slotEnd;
      });
      if (overlapsBreak) continue;

      // Check appointment overlap
      const overlapsAppt = existingAppts.some(a => {
        const aStart = a.startTime.getUTCHours() * 60 + a.startTime.getUTCMinutes();
        const aEnd = a.endTime.getUTCHours() * 60 + a.endTime.getUTCMinutes();
        return slotStart < aEnd && aStart < slotEnd;
      });
      if (overlapsAppt) continue;

      // Valid slot
      const formatTime = (mins: number) => {
        const h = Math.floor(mins / 60).toString().padStart(2, '0');
        const mStr = (mins % 60).toString().padStart(2, '0');
        return `${h}:${mStr}`;
      };
      
      validSlots.add(formatTime(slotStart));
    }
  }

  return Array.from(validSlots).sort();
}
