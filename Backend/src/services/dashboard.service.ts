import { UserRole, AvailabilityStatus } from '@prisma/client';
import { prisma } from '../prisma/client';
import * as businessAccess from './businessAccess.service';

// Helper to get start and end of periods
function getPeriods() {
  const now = new Date();
  
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  
  // Last 12 months for trends
  const twelveMonthsAgo = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth() + 1, 1));

  return { monthStart, monthEnd, twelveMonthsAgo };
}

export async function getUnifiedDashboard(
  businessId: string,
  userId: string,
  role: UserRole
) {
  await businessAccess.assertCanManageBusiness(businessId, userId, role);

  const { twelveMonthsAgo } = getPeriods();

  // 1. Fetch total appointments, status distribution, and total revenue
  // We fetch all appointments, no exclusions, to match the single source of truth rule.
  const [statusCounts, revenueRaw] = await Promise.all([
    prisma.appointment.groupBy({
      by: ['status'],
      where: { businessId },
      _count: { id: true },
    }),
    prisma.$queryRaw<{ total: string }[]>`
      SELECT COALESCE(SUM(s.price), 0) as total
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.business_id = ${businessId}::uuid
        AND a.status = 'COMPLETED'
    `
  ]);

  let totalAppointments = 0;
  const statusDistributionMap: Record<string, number> = {
    PENDING: 0,
    CONFIRMED: 0,
    COMPLETED: 0,
    CANCELLED: 0,
    NO_SHOW: 0,
    RESCHEDULED: 0,
  };

  for (const row of statusCounts) {
    statusDistributionMap[row.status] = row._count.id;
    totalAppointments += row._count.id;
  }

  const statusDistribution = Object.keys(statusDistributionMap).map(status => ({
    status,
    count: statusDistributionMap[status]
  }));

  const totalRevenue = parseFloat(revenueRaw[0]?.total || '0');

  // 2. Fetch Active Staff
  const activeStaff = await prisma.staff.count({
    where: { businessId, availabilityStatus: AvailabilityStatus.AVAILABLE }
  });

  // 3. Fetch Recent Appointments
  const recentAppointments = await prisma.appointment.findMany({
    where: { businessId },
    include: {
      customer: { select: { name: true, email: true } },
      staff: { include: { user: { select: { name: true } } } },
      service: { select: { serviceName: true, price: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  // 4. Booking Trends (last 12 months)
  const trendsRaw: any[] = await prisma.$queryRaw`
    SELECT 
      to_char(a.appointment_date, 'YYYY-MM') as period,
      COUNT(a.id)::int as "bookings",
      COALESCE(SUM(CASE WHEN a.status = 'COMPLETED' THEN s.price ELSE 0 END), 0) as "revenue"
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.business_id = ${businessId}::uuid
      AND a.appointment_date >= ${twelveMonthsAgo}
    GROUP BY period
    ORDER BY period ASC
  `;

  const bookingTrends = trendsRaw.map((t) => ({
    period: t.period,
    appointments: t.bookings,
    revenue: parseFloat(t.revenue),
  }));

  // 5. Popular Services (Top 5)
  // All bookings count towards popularity, but revenue only from COMPLETED
  const popularRaw: any[] = await prisma.$queryRaw`
    SELECT 
      s.service_name as "serviceName",
      COUNT(a.id)::int as "bookingCount",
      COALESCE(SUM(CASE WHEN a.status = 'COMPLETED' THEN s.price ELSE 0 END), 0) as "revenue"
    FROM appointments a
    JOIN services s ON a.service_id = s.id
    WHERE a.business_id = ${businessId}::uuid
    GROUP BY s.service_name
    ORDER BY "bookingCount" DESC
    LIMIT 5
  `;

  const popularServices = popularRaw.map((p) => ({
    serviceName: p.serviceName,
    bookingCount: p.bookingCount,
    revenue: parseFloat(p.revenue),
  }));

  return {
    totalAppointments,
    pendingAppointments: statusDistributionMap['PENDING'],
    confirmedAppointments: statusDistributionMap['CONFIRMED'],
    completedAppointments: statusDistributionMap['COMPLETED'],
    cancelledAppointments: statusDistributionMap['CANCELLED'],
    noShowAppointments: statusDistributionMap['NO_SHOW'],
    rescheduledAppointments: statusDistributionMap['RESCHEDULED'],
    totalRevenue,
    activeStaff,
    recentAppointments,
    bookingTrends,
    statusDistribution,
    popularServices
  };
}
