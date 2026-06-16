import { AppointmentStatus, Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';
import {
  DateRange,
  daysInRange,
  getUtcMonthRange,
  getUtcTodayRange,
  getUtcWeekRange,
} from '../utils/dateRange';

/** Statuses excluded from utilization / popularity metrics */
const EXCLUDED_ANALYTICS_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.CANCELLED,
  AppointmentStatus.NO_SHOW,
];

/** Default 8-hour workday for utilization denominator (minutes) */
const DEFAULT_DAILY_AVAILABLE_MINUTES = 8 * 60;

const bookingListSelect = {
  id: true,
  appointmentDate: true,
  startTime: true,
  endTime: true,
  status: true,
  createdAt: true,
  customer: {
    select: { id: true, name: true, email: true },
  },
  service: {
    select: { id: true, serviceName: true, durationMinutes: true, price: true },
  },
  staff: {
    select: {
      id: true,
      designation: true,
      user: { select: { id: true, name: true } },
    },
  },
  resource: {
    select: { id: true, resourceName: true, resourceType: true },
  },
} satisfies Prisma.AppointmentSelect;

export interface AnalyticsScope {
  businessId: string;
  referenceDate?: Date;
}

export interface PopularServiceRow {
  serviceId: string;
  serviceName: string;
  bookingCount: number;
  revenue: string;
}

export interface StaffUtilizationRow {
  staffId: string;
  staffName: string;
  designation: string | null;
  appointmentCount: number;
  bookedMinutes: number;
  availableMinutes: number;
  utilizationPercent: number;
}

export interface StatusDistributionRow {
  status: AppointmentStatus;
  count: number;
  percentage: number;
}

function appointmentDateFilter(range: DateRange): Prisma.DateTimeFilter {
  return {
    gte: range.start,
    lt: range.end,
  };
}

/**
 * Uses composite index: appointments(business_id, appointment_date)
 */
export async function getTodayBookings({ businessId, referenceDate }: AnalyticsScope) {
  const range = getUtcTodayRange(referenceDate);

  return prisma.appointment.findMany({
    where: {
      businessId,
      appointmentDate: appointmentDateFilter(range),
    },
    select: bookingListSelect,
    orderBy: [{ startTime: 'asc' }],
  });
}

/**
 * Uses composite index: appointments(business_id, appointment_date)
 */
export async function getWeeklyBookings({ businessId, referenceDate }: AnalyticsScope) {
  const range = getUtcWeekRange(referenceDate);

  return prisma.appointment.findMany({
    where: {
      businessId,
      appointmentDate: appointmentDateFilter(range),
    },
    select: bookingListSelect,
    orderBy: [{ appointmentDate: 'asc' }, { startTime: 'asc' }],
  });
}

/**
 * Uses composite index: appointments(business_id, appointment_date)
 */
export async function getMonthlyBookings({ businessId, referenceDate }: AnalyticsScope) {
  const range = getUtcMonthRange(referenceDate);

  return prisma.appointment.findMany({
    where: {
      businessId,
      appointmentDate: appointmentDateFilter(range),
    },
    select: bookingListSelect,
    orderBy: [{ appointmentDate: 'asc' }, { startTime: 'asc' }],
  });
}

/**
 * DISTINCT customer count for a business — single indexed scan via PostgreSQL.
 * Uses index: appointments(business_id)
 */
export async function getTotalCustomers(businessId: string): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ total: number }>>`
    SELECT COUNT(DISTINCT customer_id)::int AS total
    FROM appointments
    WHERE business_id = ${businessId}::uuid
  `;

  return rows[0]?.total ?? 0;
}

/**
 * Top services by booking volume with revenue — single JOIN + GROUP BY query.
 * Uses indexes: appointments(business_id), appointments(service_id)
 */
export async function getMostPopularServices(
  businessId: string,
  range: DateRange = getUtcMonthRange(),
  limit = 10
): Promise<PopularServiceRow[]> {
  return prisma.$queryRaw<PopularServiceRow[]>`
    SELECT
      s.id AS "serviceId",
      s.service_name AS "serviceName",
      COUNT(a.id)::int AS "bookingCount",
      COALESCE(SUM(s.price), 0)::text AS revenue
    FROM appointments a
    INNER JOIN services s ON s.id = a.service_id
    WHERE a.business_id = ${businessId}::uuid
      AND a.appointment_date >= ${range.start}::date
      AND a.appointment_date < ${range.end}::date
      AND a.status NOT IN (${Prisma.join(EXCLUDED_ANALYTICS_STATUSES)})
    GROUP BY s.id, s.service_name
    ORDER BY COUNT(a.id) DESC, s.service_name ASC
    LIMIT ${limit}
  `;
}

/**
 * Staff utilization based on booked minutes vs assumed available minutes.
 * Uses indexes: staff(business_id), appointments(staff_id, appointment_date)
 */
export async function getStaffUtilization(
  businessId: string,
  range: DateRange = getUtcMonthRange(),
  dailyAvailableMinutes = DEFAULT_DAILY_AVAILABLE_MINUTES
): Promise<StaffUtilizationRow[]> {
  const periodDays = daysInRange(range);
  const availableMinutesPerStaff = periodDays * dailyAvailableMinutes;

  const rows = await prisma.$queryRaw<
    Array<{
      staffId: string;
      staffName: string;
      designation: string | null;
      appointmentCount: number;
      bookedMinutes: number;
    }>
  >`
    SELECT
      st.id AS "staffId",
      u.name AS "staffName",
      st.designation,
      COUNT(a.id)::int AS "appointmentCount",
      COALESCE(
        SUM(
          EXTRACT(EPOCH FROM (a.end_time - a.start_time)) / 60
        ),
        0
      )::int AS "bookedMinutes"
    FROM staff st
    INNER JOIN users u ON u.id = st.user_id
    LEFT JOIN appointments a
      ON a.staff_id = st.id
      AND a.business_id = st.business_id
      AND a.appointment_date >= ${range.start}::date
      AND a.appointment_date < ${range.end}::date
      AND a.status NOT IN (${Prisma.join(EXCLUDED_ANALYTICS_STATUSES)})
    WHERE st.business_id = ${businessId}::uuid
    GROUP BY st.id, u.name, st.designation
    ORDER BY "bookedMinutes" DESC, u.name ASC
  `;

  return rows.map((row) => {
    const utilizationPercent =
      availableMinutesPerStaff === 0
        ? 0
        : Math.min(100, Math.round((row.bookedMinutes / availableMinutesPerStaff) * 10000) / 100);

    return {
      ...row,
      availableMinutes: availableMinutesPerStaff,
      utilizationPercent,
    };
  });
}

/**
 * Status breakdown with percentages — uses index appointments(business_id, appointment_date, status)
 */
export async function getAppointmentStatusDistribution(
  businessId: string,
  range: DateRange = getUtcMonthRange()
): Promise<StatusDistributionRow[]> {
  const grouped = await prisma.appointment.groupBy({
    by: ['status'],
    where: {
      businessId,
      appointmentDate: appointmentDateFilter(range),
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  const total = grouped.reduce((sum, row) => sum + row._count.id, 0);

  return grouped.map((row) => ({
    status: row.status,
    count: row._count.id,
    percentage: total === 0 ? 0 : Math.round((row._count.id / total) * 10000) / 100,
  }));
}

/**
 * Dashboard bundle — runs independent queries in parallel.
 */
export async function getBusinessDashboard(scope: AnalyticsScope) {
  const range = getUtcMonthRange(scope.referenceDate);

  const [
    todayBookings,
    weeklyBookings,
    monthlyBookings,
    totalCustomers,
    popularServices,
    staffUtilization,
    statusDistribution,
  ] = await Promise.all([
    getTodayBookings(scope),
    getWeeklyBookings(scope),
    getMonthlyBookings(scope),
    getTotalCustomers(scope.businessId),
    getMostPopularServices(scope.businessId, range),
    getStaffUtilization(scope.businessId, range),
    getAppointmentStatusDistribution(scope.businessId, range),
  ]);

  return {
    todayBookings,
    weeklyBookings,
    monthlyBookings,
    totalCustomers,
    popularServices,
    staffUtilization,
    statusDistribution,
  };
}

export { getUtcTodayRange, getUtcWeekRange, getUtcMonthRange };
export type { DateRange };
