import { UserRole } from '@prisma/client';
import { prisma } from '../prisma/client';
import * as businessAccess from './businessAccess.service';

// Helper to get start and end of periods
function getPeriods() {
  const now = new Date();
  
  const todayStart = new Date(now.toISOString().slice(0, 10));
  const todayEnd = new Date(todayStart);
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

  const weekStart = new Date(todayStart);
  const day = weekStart.getUTCDay();
  const diff = weekStart.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday as start of week
  weekStart.setUTCDate(diff);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  return { todayStart, todayEnd, weekStart, weekEnd, monthStart, monthEnd };
}

// 1. Booking Summary
export async function getBookingSummary(businessId: string, userId: string, role: UserRole) {
  await businessAccess.assertCanManageBusiness(businessId, userId, role);

  const { todayStart, todayEnd, weekStart, weekEnd, monthStart, monthEnd } = getPeriods();

  const getStats = async (start: Date, end: Date) => {
    const result: any[] = await prisma.$queryRaw`
      SELECT 
        COUNT(a.id)::int as "totalBookings",
        COALESCE(SUM(s.price), 0) as "totalRevenue"
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.business_id = ${businessId}::uuid
        AND a.appointment_date >= ${start}
        AND a.appointment_date < ${end}
        AND a.status NOT IN ('CANCELLED', 'NO_SHOW')
    `;

    const cancelled: any[] = await prisma.$queryRaw`
      SELECT COUNT(id)::int as "cancelledBookings"
      FROM appointments
      WHERE business_id = ${businessId}::uuid
        AND appointment_date >= ${start}
        AND appointment_date < ${end}
        AND status = 'CANCELLED'
    `;

    return {
      totalBookings: result[0]?.totalBookings || 0,
      totalRevenue: parseFloat(result[0]?.totalRevenue || '0'),
      cancelledBookings: cancelled[0]?.cancelledBookings || 0,
    };
  };

  const [today, week, month] = await Promise.all([
    getStats(todayStart, todayEnd),
    getStats(weekStart, weekEnd),
    getStats(monthStart, monthEnd),
  ]);

  return { today, week, month };
}

// 2. Revenue Trends
export async function getRevenueTrends(
  businessId: string,
  userId: string,
  role: UserRole,
  startDate?: string,
  endDate?: string,
  groupBy: 'day' | 'week' | 'month' = 'day'
) {
  await businessAccess.assertCanManageBusiness(businessId, userId, role);

  const start = startDate ? new Date(startDate) : getPeriods().monthStart;
  const end = endDate ? new Date(endDate) : new Date();

  const dateFormat = groupBy === 'month' ? 'YYYY-MM' : groupBy === 'week' ? 'IYYY-IW' : 'YYYY-MM-DD';

  const trends: any[] = await prisma.$queryRaw`
    SELECT 
      to_char(a.appointment_date, ${dateFormat}) as period,
      COUNT(a.id)::int as "bookings",
      COALESCE(SUM(s.price), 0) as "revenue"
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.business_id = ${businessId}::uuid
      AND a.appointment_date >= ${start}
      AND a.appointment_date <= ${end}
      AND a.status NOT IN ('CANCELLED', 'NO_SHOW')
    GROUP BY period
    ORDER BY period ASC
  `;

  return trends.map((t) => ({
    period: t.period,
    bookings: t.bookings,
    revenue: parseFloat(t.revenue),
  }));
}

// 3. Staff Utilization
export async function getStaffUtilization(
  businessId: string,
  userId: string,
  role: UserRole,
  startDate?: string,
  endDate?: string
) {
  await businessAccess.assertCanManageBusiness(businessId, userId, role);

  const start = startDate ? new Date(startDate) : getPeriods().monthStart;
  const end = endDate ? new Date(endDate) : new Date();

  const utilization: any[] = await prisma.$queryRaw`
    SELECT 
      u.name as "staffName",
      COUNT(a.id)::int as "totalAppointments",
      COALESCE(SUM(s.duration_minutes), 0)::int as "totalMinutes"
    FROM appointments a
    JOIN staff st ON a.staff_id = st.id
    JOIN users u ON st.user_id = u.id
    JOIN services s ON a.service_id = s.id
    WHERE a.business_id = ${businessId}::uuid
      AND a.appointment_date >= ${start}
      AND a.appointment_date <= ${end}
      AND a.status NOT IN ('CANCELLED', 'NO_SHOW')
    GROUP BY u.name
    ORDER BY "totalAppointments" DESC
  `;

  return utilization.map(u => ({
    staffName: u.staffName,
    totalAppointments: u.totalAppointments,
    totalHours: u.totalMinutes / 60,
  }));
}

// 4. Popular Services
export async function getPopularServices(
  businessId: string,
  userId: string,
  role: UserRole,
  limit: number = 5
) {
  await businessAccess.assertCanManageBusiness(businessId, userId, role);

  const popular: any[] = await prisma.$queryRaw`
    SELECT 
      s.service_name as "serviceName",
      COUNT(a.id)::int as "bookingsCount",
      COALESCE(SUM(s.price), 0) as "totalRevenue"
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.business_id = ${businessId}::uuid
      AND a.status NOT IN ('CANCELLED', 'NO_SHOW')
    GROUP BY s.service_name
    ORDER BY "bookingsCount" DESC
    LIMIT ${limit}::int
  `;

  return popular.map((p) => ({
    serviceName: p.serviceName,
    bookingsCount: p.bookingsCount,
    totalRevenue: parseFloat(p.totalRevenue),
  }));
}

// 5. Status Distribution
export async function getAppointmentStatusDistribution(
  businessId: string,
  userId: string,
  role: UserRole,
  startDate?: string,
  endDate?: string
) {
  await businessAccess.assertCanManageBusiness(businessId, userId, role);

  const start = startDate ? new Date(startDate) : getPeriods().monthStart;
  const end = endDate ? new Date(endDate) : new Date();

  const distribution = await prisma.appointment.groupBy({
    by: ['status'],
    where: {
      businessId,
      appointmentDate: {
        gte: start,
        lte: end,
      },
    },
    _count: {
      id: true,
    },
  });

  return distribution.map(d => ({
    status: d.status,
    count: d._count.id,
  }));
}
