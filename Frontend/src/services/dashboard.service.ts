import { api } from './api';

// ─── Dashboard Analytics Service ─────────────────────────────────────────────
export interface DashboardSummary {
  totalAppointments: number;
  confirmedAppointments: number;
  cancelledAppointments: number;
  completedAppointments: number;
  pendingAppointments: number;
  totalRevenue: number;
  activeStaff?: number;
}

export interface RevenueTrend {
  period: string;
  revenue: number;
  appointments: number;
}

export interface StaffUtilization {
  staffId: string;
  staffName: string;
  totalAppointments: number;
  utilizationRate: number;
}

export interface PopularService {
  serviceId: string;
  serviceName: string;
  bookingCount: number;
  revenue: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

export const dashboardService = {
  getSummary: async (params?: { businessId?: string; startDate?: string; endDate?: string }) => {
    const res = await api.get<{ success: true; data: any }>('/dashboard/summary', { params });
    const data = res.data.data;
    // Map backend's { today, week, month } to DashboardSummary
    // Since Dashboard.tsx says "All time" and "Awaiting completion", we do our best with 'month'
    const month = data.month || { totalBookings: 0, totalRevenue: 0, cancelledBookings: 0 };
    return {
      totalAppointments: month.totalBookings,
      confirmedAppointments: 0, // To do: add to backend
      cancelledAppointments: month.cancelledBookings,
      completedAppointments: 0,
      pendingAppointments: 0,
      totalRevenue: month.totalRevenue,
      activeStaff: 0
    } as DashboardSummary;
  },

  getRevenueTrends: async (params?: { businessId?: string; period?: 'daily' | 'weekly' | 'monthly'; startDate?: string; endDate?: string }) => {
    const res = await api.get<{ success: true; data: { trends: any[] } }>('/dashboard/revenue-trends', { params });
    const list = res.data.data.trends || [];
    return list.map(t => ({
      period: t.period,
      revenue: t.revenue,
      appointments: t.bookings // Backend returns 'bookings', frontend wants 'appointments'
    })) as RevenueTrend[];
  },

  getStaffUtilization: async (params?: { businessId?: string; startDate?: string; endDate?: string }) => {
    const res = await api.get<{ success: true; data: { utilization: any[] } }>('/dashboard/staff-utilization', { params });
    const list = res.data.data.utilization || [];
    return list.map(u => ({
      staffId: '',
      staffName: u.staffName,
      totalAppointments: u.totalAppointments,
      utilizationRate: u.totalHours // Mapping hours
    })) as StaffUtilization[];
  },

  getPopularServices: async (params?: { businessId?: string; limit?: number; startDate?: string; endDate?: string }) => {
    // Backend returns 'popularServices', not 'services'
    const res = await api.get<{ success: true; data: { popularServices: any[] } }>('/dashboard/popular-services', { params });
    const list = res.data.data.popularServices || [];
    return list.map(s => ({
      serviceId: '',
      serviceName: s.serviceName,
      bookingCount: s.bookingsCount, // Backend returns bookingsCount
      revenue: s.totalRevenue        // Backend returns totalRevenue
    })) as PopularService[];
  },

  getStatusDistribution: async (params?: { businessId?: string; startDate?: string; endDate?: string }) => {
    // Backend returns 'statusDistribution', not 'distribution'
    const res = await api.get<{ success: true; data: { statusDistribution: any[] } }>('/dashboard/status-distribution', { params });
    return (res.data.data.statusDistribution || []) as StatusDistribution[];
  },
};
