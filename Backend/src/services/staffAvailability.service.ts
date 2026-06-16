import { DayOfWeek, UserRole } from '@prisma/client';
import { prisma, PrismaTransactionClient } from '../prisma/client';
import { AppError } from '../utils/AppError';
import { assertCanManageBusiness } from './businessAccess.service';
import { toTimeDate } from '../utils/dateTime';
import { timeToMinutes } from '../utils/appointmentHelpers';
import type {
  CreateAvailabilityInput,
  UpdateAvailabilityInput,
} from '../validations/staffAvailability.validation';

// ---------------------------------------------------------------------------
// Day-of-week helper
// ---------------------------------------------------------------------------

const JS_DOW_TO_ENUM: DayOfWeek[] = [
  DayOfWeek.SUN,
  DayOfWeek.MON,
  DayOfWeek.TUE,
  DayOfWeek.WED,
  DayOfWeek.THU,
  DayOfWeek.FRI,
  DayOfWeek.SAT,
];

export function dateToDayOfWeek(date: Date): DayOfWeek {
  return JS_DOW_TO_ENUM[date.getUTCDay()];
}

// ---------------------------------------------------------------------------
// Resolve a staff profile → validate business access
// ---------------------------------------------------------------------------

async function resolveStaffWithAccess(staffId: string, userId: string, role: UserRole) {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { id: true, businessId: true },
  });

  if (!staff) throw new AppError('Staff member not found', 404);

  await assertCanManageBusiness(staff.businessId, userId, role);

  return staff;
}

// ---------------------------------------------------------------------------
// Set (upsert) weekly availability for one day
// ---------------------------------------------------------------------------

export async function setAvailability(
  userId: string,
  role: UserRole,
  input: CreateAvailabilityInput
) {
  await resolveStaffWithAccess(input.staffId, userId, role);

  return prisma.staffAvailability.upsert({
    where: {
      staffId_dayOfWeek: {
        staffId:   input.staffId,
        dayOfWeek: input.dayOfWeek,
      },
    },
    create: {
      staffId:   input.staffId,
      dayOfWeek: input.dayOfWeek,
      startTime: toTimeDate(input.startTime),
      endTime:   toTimeDate(input.endTime),
      isActive:  input.isActive ?? true,
    },
    update: {
      startTime: toTimeDate(input.startTime),
      endTime:   toTimeDate(input.endTime),
      isActive:  input.isActive ?? true,
    },
  });
}

// ---------------------------------------------------------------------------
// Get full weekly schedule for a staff member
// ---------------------------------------------------------------------------

export async function getAvailabilityByStaff(staffId: string) {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { id: true },
  });

  if (!staff) throw new AppError('Staff member not found', 404);

  return prisma.staffAvailability.findMany({
    where: { staffId },
    orderBy: { dayOfWeek: 'asc' },
  });
}

// ---------------------------------------------------------------------------
// Update one availability row
// ---------------------------------------------------------------------------

export async function updateAvailability(
  id: string,
  userId: string,
  role: UserRole,
  input: UpdateAvailabilityInput
) {
  const row = await prisma.staffAvailability.findUnique({
    where: { id },
    select: { id: true, staffId: true },
  });

  if (!row) throw new AppError('Availability record not found', 404);

  await resolveStaffWithAccess(row.staffId, userId, role);

  return prisma.staffAvailability.update({
    where: { id },
    data: {
      ...(input.startTime ? { startTime: toTimeDate(input.startTime) } : {}),
      ...(input.endTime   ? { endTime:   toTimeDate(input.endTime) }   : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive }  : {}),
    },
  });
}

// ---------------------------------------------------------------------------
// Delete one availability row
// ---------------------------------------------------------------------------

export async function deleteAvailability(id: string, userId: string, role: UserRole) {
  const row = await prisma.staffAvailability.findUnique({
    where: { id },
    select: { id: true, staffId: true },
  });

  if (!row) throw new AppError('Availability record not found', 404);

  await resolveStaffWithAccess(row.staffId, userId, role);

  await prisma.staffAvailability.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Core availability check — called by the booking validator
// Returns an error message string, or null if staff is available
// ---------------------------------------------------------------------------

type DbClient = PrismaTransactionClient | typeof prisma;

export async function isStaffAvailableAtSlot(
  db: DbClient,
  staffId: string,
  appointmentDate: Date,
  startTime: Date,
  endTime: Date
): Promise<string | null> {
  const dow = dateToDayOfWeek(appointmentDate);

  // 1. Check working-hours schedule
  const schedule = await (db as any).staffAvailability.findFirst({
    where: { staffId, dayOfWeek: dow, isActive: true },
    select: { startTime: true, endTime: true },
  });

  if (!schedule) {
    return `Staff does not have working hours configured for ${dow} — cannot book on this day`;
  }

  const schedStart = timeToMinutes(schedule.startTime);
  const schedEnd   = timeToMinutes(schedule.endTime);
  const slotStart  = timeToMinutes(startTime);
  const slotEnd    = timeToMinutes(endTime);

  if (slotStart < schedStart || slotEnd > schedEnd) {
    const pad = (n: number) => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
    return (
      `Requested slot (${pad(slotStart)}–${pad(slotEnd)}) falls outside staff working hours ` +
      `(${pad(schedStart)}–${pad(schedEnd)}) on ${dow}`
    );
  }

  // 2. Check approved leave
  const leave = await (db as any).staffLeave.findFirst({
    where: {
      staffId,
      leaveDate: appointmentDate,
      status: 'APPROVED',
    },
    select: { id: true },
  });

  if (leave) {
    return `Staff is on approved leave on ${appointmentDate.toISOString().slice(0, 10)} and cannot be booked`;
  }

  return null;
}
