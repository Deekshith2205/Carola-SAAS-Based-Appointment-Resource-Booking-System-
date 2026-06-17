import { UserRole } from '@prisma/client';
import { prisma } from './src/prisma/client';
import * as dashboardService from './src/services/dashboard.service';
import * as businessAccessService from './src/services/businessAccess.service';

// Mock businessAccess check
(businessAccessService as any).assertCanManageBusiness = async () => true;

// Mock Prisma
const originalQueryRaw = prisma.$queryRaw;
const originalGroupBy = prisma.appointment.groupBy;

(prisma as any).$queryRaw = async (...args: any[]) => {
  const queryStr = Array.isArray(args[0]) ? args[0].join('') : String(args[0]);
  // console.log("MOCK QUERY:", queryStr);
  
  if (queryStr.includes('GROUP BY s.service_name')) {
    // Popular services
    return [
      { serviceName: 'Yoga', bookingsCount: 10, totalRevenue: '500.00' },
      { serviceName: 'Pilates', bookingsCount: 5, totalRevenue: '250.00' },
    ];
  }
  if (queryStr.includes('GROUP BY period')) {
    // Revenue trends
    return [
      { period: '2026-06-15', bookings: 3, revenue: '150.00' },
      { period: '2026-06-16', bookings: 5, revenue: '250.00' },
    ];
  }
  if (queryStr.includes('totalRevenue')) {
    // Booking summary (total)
    return [{ totalBookings: 8, totalRevenue: '400.00' }];
  }

  if (queryStr.includes('cancelledBookings')) {
    return [{ cancelledBookings: 1 }];
  }

  if (queryStr.includes('totalMinutes')) {
    // Staff utilization
    return [
      { staffName: 'Alice', totalAppointments: 5, totalMinutes: 300 },
      { staffName: 'Bob', totalAppointments: 3, totalMinutes: 180 },
    ];
  }

  return [];
};

(prisma.appointment as any).groupBy = async () => {
  return [
    { status: 'CONFIRMED', _count: { id: 5 } },
    { status: 'PENDING', _count: { id: 3 } },
  ];
};

const originalFindFirst = prisma.business.findFirst;
(prisma.business as any).findFirst = async () => {
  return { id: BUSINESS_ID, ownerId: USER_ID };
};

const BUSINESS_ID = 'aabbccdd-0000-0000-0000-000000000001';
const USER_ID = 'aabbccdd-0000-0000-0000-000000000002';
const ROLE = UserRole.BUSINESS_OWNER;

async function runTests() {
  console.log('--- STARTING DASHBOARD UNIT TESTS ---\n');

  // 1. Booking Summary
  {
    const summary = await dashboardService.getBookingSummary(BUSINESS_ID, USER_ID, ROLE);
    if (summary.today.totalBookings !== 8 || summary.today.totalRevenue !== 400 || summary.today.cancelledBookings !== 1) {
      throw new Error(`Booking summary mismatch: ${JSON.stringify(summary)}`);
    }
    console.log('✅ getBookingSummary Passed');
  }

  // 2. Revenue Trends
  {
    const trends = await dashboardService.getRevenueTrends(BUSINESS_ID, USER_ID, ROLE, '2026-06-01', '2026-06-30', 'day');
    if (trends.length !== 2 || trends[0].revenue !== 150) {
      throw new Error(`Revenue trends mismatch: ${JSON.stringify(trends)}`);
    }
    console.log('✅ getRevenueTrends Passed');
  }

  // 3. Staff Utilization
  {
    const utilization = await dashboardService.getStaffUtilization(BUSINESS_ID, USER_ID, ROLE);
    if (utilization.length !== 2 || utilization[0].totalHours !== 5) {
      throw new Error(`Staff utilization mismatch: ${JSON.stringify(utilization)}`);
    }
    console.log('✅ getStaffUtilization Passed');
  }

  // 4. Popular Services
  {
    const popular = await dashboardService.getPopularServices(BUSINESS_ID, USER_ID, ROLE, 5);
    if (popular.length !== 2 || popular[0].serviceName !== 'Yoga') {
      throw new Error(`Popular services mismatch: ${JSON.stringify(popular)}`);
    }
    console.log('✅ getPopularServices Passed');
  }

  // 5. Status Distribution
  {
    const dist = await dashboardService.getAppointmentStatusDistribution(BUSINESS_ID, USER_ID, ROLE);
    if (dist.length !== 2 || dist[0].count !== 5) {
      throw new Error(`Status distribution mismatch: ${JSON.stringify(dist)}`);
    }
    console.log('✅ getAppointmentStatusDistribution Passed');
  }

  console.log('\n🎉 ALL DASHBOARD TESTS PASSED! 🎉');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(() => {
  // Restore
  prisma.$queryRaw = originalQueryRaw;
  prisma.appointment.groupBy = originalGroupBy;
});
