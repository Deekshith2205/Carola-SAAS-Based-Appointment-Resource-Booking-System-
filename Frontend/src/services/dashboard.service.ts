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
    const res = await api.get<{ success: true; data: DashboardSummary }>('/dashboard/summary', { params });
    return res.data.data;
  },

  getRevenueTrends: async (params?: { businessId?: string; period?: 'daily' | 'weekly' | 'monthly'; startDate?: string; endDate?: string }) => {
    const res = await api.get<{ success: true; data: { trends: RevenueTrend[] } }>('/dashboard/revenue-trends', { params });
    return res.data.data.trends;
  },

  getStaffUtilization: async (params?: { businessId?: string; startDate?: string; endDate?: string }) => {
    const res = await api.get<{ success: true; data: { utilization: StaffUtilization[] } }>('/dashboard/staff-utilization', { params });
    return res.data.data.utilization;
  },

  getPopularServices: async (params?: { businessId?: string; limit?: number; startDate?: string; endDate?: string }) => {
    const res = await api.get<{ success: true; data: { services: PopularService[] } }>('/dashboard/popular-services', { params });
    return res.data.data.services;
  },

  getStatusDistribution: async (params?: { businessId?: string; startDate?: string; endDate?: string }) => {
    const res = await api.get<{ success: true; data: { distribution: StatusDistribution[] } }>('/dashboard/status-distribution', { params });
    return res.data.data.distribution;
  },
};
