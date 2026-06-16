import { AppointmentStatus } from '@prisma/client';
import { AppError } from './AppError';

export function timeToMinutes(time: Date): number {
  return time.getUTCHours() * 60 + time.getUTCMinutes();
}

export function timesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  const startMinutesA = timeToMinutes(startA);
  const endMinutesA = timeToMinutes(endA);
  const startMinutesB = timeToMinutes(startB);
  const endMinutesB = timeToMinutes(endB);

  if (endMinutesA <= startMinutesA) {
    throw new AppError('End time must be after start time', 400);
  }

  return startMinutesA < endMinutesB && startMinutesB < endMinutesA;
}

export function assertEndAfterStart(startTime: Date, endTime: Date): void {
  if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    throw new AppError('End time must be after start time', 400);
  }
}

export const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.RESCHEDULED,
];
