export interface DateRange {
  /** Inclusive start (UTC midnight) */
  start: Date;
  /** Exclusive end (UTC midnight) */
  end: Date;
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addUtcDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function addUtcMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

/** ISO week: Monday → next Monday (exclusive end) */
export function getUtcWeekRange(referenceDate = new Date()): DateRange {
  const day = startOfUtcDay(referenceDate);
  const dayOfWeek = day.getUTCDay();
  const daysFromMonday = (dayOfWeek + 6) % 7;

  const start = addUtcDays(day, -daysFromMonday);
  const end = addUtcDays(start, 7);

  return { start, end };
}

export function getUtcMonthRange(referenceDate = new Date()): DateRange {
  const start = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1));
  const end = addUtcMonths(start, 1);

  return { start, end };
}

export function getUtcTodayRange(referenceDate = new Date()): DateRange {
  const start = startOfUtcDay(referenceDate);
  return { start, end: addUtcDays(start, 1) };
}

export function daysInRange(range: DateRange): number {
  return Math.round((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24));
}
