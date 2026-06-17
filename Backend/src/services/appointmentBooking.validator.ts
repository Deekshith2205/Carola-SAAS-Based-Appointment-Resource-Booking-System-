import {
  AvailabilityStatus,
  Prisma,
  ResourceStatus,
  UserRole,
} from '@prisma/client';
import { prisma, PrismaTransactionClient } from '../prisma/client';
import { AppError } from '../utils/AppError';
import {
  ACTIVE_APPOINTMENT_STATUSES,
  assertEndAfterStart,
  timeToMinutes,
  timesOverlap,
} from '../utils/appointmentHelpers';
import { formatDateLabel, formatTimeLabel } from '../utils/dateTime';
import { isStaffAvailableAtSlot } from './staffAvailability.service';
// ---------------------------------------------------------------------------
// Booking Validation Error — aggregates all validation failures together
// ---------------------------------------------------------------------------

export class BookingValidationError extends AppError {
  readonly errors: string[];

  constructor(errors: string[]) {
    super('Appointment booking validation failed', 400);
    this.errors = errors;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ---------------------------------------------------------------------------
// Internal Types
// ---------------------------------------------------------------------------

type DbClient = PrismaTransactionClient | typeof prisma;

export interface BookingSlot {
  businessId: string;
  appointmentDate: Date;
  startTime: Date;
  endTime: Date;
  staffId?: string | null;
  resourceId?: string | null;
  excludeAppointmentId?: string;
}

export interface BookingContext {
  customerId: string;
  businessId: string;
  serviceId: string;
  staffId?: string | null;
  resourceId?: string | null;
  appointmentDate: Date;
  startTime: Date;
  endTime: Date;
  excludeAppointmentId?: string;
}

// ---------------------------------------------------------------------------
// User-Friendly Status Messages
// ---------------------------------------------------------------------------

const STAFF_STATUS_MESSAGES: Record<Exclude<AvailabilityStatus, 'AVAILABLE'>, string> = {
  UNAVAILABLE: 'The selected staff member is marked as unavailable',
  BUSY: 'The selected staff member is currently busy and cannot be booked',
  ON_LEAVE: 'The selected staff member is on leave and cannot be booked',
};

const RESOURCE_STATUS_MESSAGES: Record<Exclude<ResourceStatus, 'AVAILABLE'>, string> = {
  IN_USE: 'The selected resource is currently in use',
  MAINTENANCE: 'The selected resource is under maintenance',
  UNAVAILABLE: 'The selected resource is unavailable for booking',
};

// ---------------------------------------------------------------------------
// 1. Business Existence & Subscription Validator
// ---------------------------------------------------------------------------

export async function validateBusinessForBooking(db: DbClient, businessId: string) {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      businessName: true,
      ownerId: true,
      subscriptionStatus: true,
    },
  });

  if (!business) {
    throw new AppError('Business not found', 404);
  }

  if (business.subscriptionStatus !== 'ACTIVE' && business.subscriptionStatus !== 'TRIAL') {
    throw new AppError(
      `Business "${business.businessName}" is not accepting new appointments at the moment (subscription: ${business.subscriptionStatus})`,
      403
    );
  }

  return business;
}

// ---------------------------------------------------------------------------
// 2. Customer Existence & Role Validator
// ---------------------------------------------------------------------------

export async function validateCustomerForBooking(
  db: DbClient,
  customerId: string
): Promise<void> {
  const customer = await db.user.findUnique({
    where: { id: customerId },
    select: { id: true, role: true, name: true },
  });

  if (!customer) {
    throw new AppError('Customer account not found', 404);
  }

  if (customer.role !== UserRole.CUSTOMER && customer.role !== UserRole.SUPER_ADMIN) {
    throw new AppError(
      `Only customer accounts can book appointments. The account "${customerId}" has role "${customer.role}"`,
      403
    );
  }
}

// ---------------------------------------------------------------------------
// 3. Service Existence & Business Affiliation Validator
// ---------------------------------------------------------------------------

export async function validateServiceForBooking(
  db: DbClient,
  businessId: string,
  serviceId: string
) {
  const service = await db.service.findFirst({
    where: { id: serviceId, businessId },
    select: {
      id: true,
      serviceName: true,
      durationMinutes: true,
    },
  });

  if (!service) {
    throw new AppError(
      'Service not found or does not belong to the selected business',
      404
    );
  }

  return service;
}

// ---------------------------------------------------------------------------
// 4. Staff Existence, Business Affiliation & Availability Validator
// ---------------------------------------------------------------------------

export async function validateStaffForBooking(
  db: DbClient,
  businessId: string,
  staffId: string
) {
  const staff = await db.staff.findFirst({
    where: { id: staffId, businessId },
    select: {
      id: true,
      availabilityStatus: true,
      user: { select: { name: true } },
    },
  });

  if (!staff) {
    throw new AppError(
      'Staff member not found or does not belong to the selected business',
      404
    );
  }

  if (staff.availabilityStatus !== AvailabilityStatus.AVAILABLE) {
    const message =
      STAFF_STATUS_MESSAGES[
        staff.availabilityStatus as Exclude<AvailabilityStatus, 'AVAILABLE'>
      ] ?? 'The selected staff member is not available for booking';

    throw new AppError(message, 409);
  }

  return staff;
}

// ---------------------------------------------------------------------------
// 5. Resource Existence, Business Affiliation & Availability Validator
// ---------------------------------------------------------------------------

export async function validateResourceForBooking(
  db: DbClient,
  businessId: string,
  resourceId: string
) {
  const resource = await db.resource.findFirst({
    where: { id: resourceId, businessId },
    select: {
      id: true,
      resourceName: true,
      status: true,
    },
  });

  if (!resource) {
    throw new AppError(
      'Resource not found or does not belong to the selected business',
      404
    );
  }

  if (resource.status !== ResourceStatus.AVAILABLE) {
    const message =
      RESOURCE_STATUS_MESSAGES[
        resource.status as Exclude<ResourceStatus, 'AVAILABLE'>
      ] ?? 'The selected resource is not available for booking';

    throw new AppError(message, 409);
  }

  return resource;
}

// ---------------------------------------------------------------------------
// Duration Validator: endTime - startTime must match service.durationMinutes
// ---------------------------------------------------------------------------

export function validateDuration(
  startTime: Date,
  endTime: Date,
  serviceDurationMinutes: number
): string | null {
  const actualDuration = timeToMinutes(endTime) - timeToMinutes(startTime);

  if (actualDuration !== serviceDurationMinutes) {
    return (
      `Appointment duration mismatch: the selected service requires exactly ${serviceDurationMinutes} minute(s), ` +
      `but the requested time slot is ${actualDuration} minute(s) ` +
      `(${formatTimeLabel(startTime)} → ${formatTimeLabel(endTime)})`
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Conflict: Staff Double Booking Detector
// ---------------------------------------------------------------------------

export async function assertNoStaffDoubleBooking(
  db: DbClient,
  slot: BookingSlot
): Promise<string | null> {
  if (!slot.staffId) return null;

  const existing = await db.appointment.findMany({
    where: {
      businessId: slot.businessId,
      appointmentDate: slot.appointmentDate,
      staffId: slot.staffId,
      status: { in: ACTIVE_APPOINTMENT_STATUSES },
      ...(slot.excludeAppointmentId ? { id: { not: slot.excludeAppointmentId } } : {}),
    },
    select: { id: true, startTime: true, endTime: true },
  });

  for (const appt of existing) {
    if (timesOverlap(appt.startTime, appt.endTime, slot.startTime, slot.endTime)) {
      return (
        `Staff conflict: the selected staff member already has an appointment from ` +
        `${formatTimeLabel(appt.startTime)} to ${formatTimeLabel(appt.endTime)} ` +
        `on ${formatDateLabel(slot.appointmentDate)}`
      );
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Conflict: Resource Double Booking Detector
// ---------------------------------------------------------------------------

export async function assertNoResourceDoubleBooking(
  db: DbClient,
  slot: BookingSlot
): Promise<string | null> {
  if (!slot.resourceId) return null;

  const existing = await db.appointment.findMany({
    where: {
      businessId: slot.businessId,
      appointmentDate: slot.appointmentDate,
      resourceId: slot.resourceId,
      status: { in: ACTIVE_APPOINTMENT_STATUSES },
      ...(slot.excludeAppointmentId ? { id: { not: slot.excludeAppointmentId } } : {}),
    },
    select: { id: true, startTime: true, endTime: true },
  });

  for (const appt of existing) {
    if (timesOverlap(appt.startTime, appt.endTime, slot.startTime, slot.endTime)) {
      return (
        `Resource conflict: the selected resource is already booked from ` +
        `${formatTimeLabel(appt.startTime)} to ${formatTimeLabel(appt.endTime)} ` +
        `on ${formatDateLabel(slot.appointmentDate)}`
      );
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Conflict: Customer Duplicate / Overlap Booking Detector
// ---------------------------------------------------------------------------

export async function assertNoCustomerDoubleBooking(
  db: DbClient,
  customerId: string,
  businessId: string,
  slot: BookingSlot
): Promise<string | null> {
  const existing = await db.appointment.findMany({
    where: {
      customerId,
      businessId,
      appointmentDate: slot.appointmentDate,
      status: { in: ACTIVE_APPOINTMENT_STATUSES },
      ...(slot.excludeAppointmentId ? { id: { not: slot.excludeAppointmentId } } : {}),
    },
    select: { id: true, startTime: true, endTime: true },
  });

  for (const appt of existing) {
    // Exact duplicate check
    if (
      timeToMinutes(appt.startTime) === timeToMinutes(slot.startTime) &&
      timeToMinutes(appt.endTime) === timeToMinutes(slot.endTime)
    ) {
      return (
        `Duplicate booking detected: you already have an appointment at ` +
        `${formatTimeLabel(slot.startTime)} on ${formatDateLabel(slot.appointmentDate)} at this business`
      );
    }

    // Overlap check
    if (timesOverlap(appt.startTime, appt.endTime, slot.startTime, slot.endTime)) {
      return (
        `Customer schedule conflict: you already have an overlapping appointment from ` +
        `${formatTimeLabel(appt.startTime)} to ${formatTimeLabel(appt.endTime)} ` +
        `on ${formatDateLabel(slot.appointmentDate)}`
      );
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Unified Booking Validator — runs all checks and aggregates errors
// ---------------------------------------------------------------------------

export async function validateAppointmentBooking(
  db: DbClient,
  ctx: BookingContext
): Promise<{
  business: { id: string; businessName: string; ownerId: string };
  service: { id: string; serviceName: string; durationMinutes: number };
}> {
  const errors: string[] = [];

  const slot: BookingSlot = {
    businessId: ctx.businessId,
    appointmentDate: ctx.appointmentDate,
    startTime: ctx.startTime,
    endTime: ctx.endTime,
    staffId: ctx.staffId,
    resourceId: ctx.resourceId,
    excludeAppointmentId: ctx.excludeAppointmentId,
  };

  // --- Guard: time range validity (must check before duration or overlap checks)
  try {
    assertEndAfterStart(ctx.startTime, ctx.endTime);
  } catch {
    errors.push(
      `Invalid time range: end time ${formatTimeLabel(ctx.endTime)} must be after start time ${formatTimeLabel(ctx.startTime)}`
    );
    // Cannot proceed with time-dependent checks if range is invalid
    throw new BookingValidationError(errors);
  }

  // --- 1. Business existence & subscription
  let business: { id: string; businessName: string; ownerId: string } | null = null;
  try {
    business = await validateBusinessForBooking(db, ctx.businessId);
  } catch (err) {
    errors.push(err instanceof AppError ? err.message : 'Business validation failed');
  }

  // --- 2. Customer existence & role
  try {
    await validateCustomerForBooking(db, ctx.customerId);
  } catch (err) {
    errors.push(err instanceof AppError ? err.message : 'Customer validation failed');
  }

  // --- 3. Service existence, business affiliation & duration conformance
  let service: { id: string; serviceName: string; durationMinutes: number } | null = null;
  try {
    service = await validateServiceForBooking(db, ctx.businessId, ctx.serviceId);

    // Duration conformance — only check if service was found
    const durationError = validateDuration(ctx.startTime, ctx.endTime, service.durationMinutes);
    if (durationError) {
      errors.push(durationError);
    }
  } catch (err) {
    errors.push(err instanceof AppError ? err.message : 'Service validation failed');
  }

  // --- 4. Staff existence, affiliation, availability & conflict (if provided)
  if (ctx.staffId) {
    try {
      await validateStaffForBooking(db, ctx.businessId, ctx.staffId);
    } catch (err) {
      errors.push(err instanceof AppError ? err.message : 'Staff validation failed');
    }

    // --- 4a. Working-hours & leave availability check
    const availabilityError = await isStaffAvailableAtSlot(
      db as any,
      ctx.staffId,
      ctx.appointmentDate,
      ctx.startTime,
      ctx.endTime
    );
    if (availabilityError) errors.push(availabilityError);

    // Staff overlap — run independently so both availability AND overlap errors surface
    const staffConflict = await assertNoStaffDoubleBooking(db, slot);
    if (staffConflict) errors.push(staffConflict);
  }

  // --- 5. Resource existence, affiliation, availability & conflict (if provided)
  if (ctx.resourceId) {
    try {
      await validateResourceForBooking(db, ctx.businessId, ctx.resourceId);
    } catch (err) {
      errors.push(err instanceof AppError ? err.message : 'Resource validation failed');
    }

    // Resource overlap — run independently
    const resourceConflict = await assertNoResourceDoubleBooking(db, slot);
    if (resourceConflict) errors.push(resourceConflict);
  }

  // --- 6. Customer duplicate / overlap check
  const customerConflict = await assertNoCustomerDoubleBooking(
    db,
    ctx.customerId,
    ctx.businessId,
    slot
  );
  if (customerConflict) errors.push(customerConflict);

  // --- Throw aggregated errors if any
  if (errors.length > 0) {
    throw new BookingValidationError(errors);
  }

  // Both business and service are guaranteed non-null here because any null
  // would have added an error and thrown above.
  return { business: business!, service: service! };
}

// ---------------------------------------------------------------------------
// Serializable Transaction Runner
// ---------------------------------------------------------------------------

export async function validateBookingSlot(
  db: DbClient,
  slot: BookingSlot,
  options: {
    staffId?: string | null;
    resourceId?: string | null;
  }
): Promise<void> {
  assertEndAfterStart(slot.startTime, slot.endTime);

  if (options.staffId) {
    await validateStaffForBooking(db, slot.businessId, options.staffId);
    const conflict = await assertNoStaffDoubleBooking(db, { ...slot, staffId: options.staffId });
    if (conflict) throw new AppError(conflict, 409);
  }

  if (options.resourceId) {
    await validateResourceForBooking(db, slot.businessId, options.resourceId);
    const conflict = await assertNoResourceDoubleBooking(db, { ...slot, resourceId: options.resourceId });
    if (conflict) throw new AppError(conflict, 409);
  }
}

export async function runSerializableTransaction<T>(
  fn: (tx: PrismaTransactionClient) => Promise<T>
): Promise<T> {
  return (prisma as any).$transaction(fn as any, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}
