import { api } from './api';

// ─── Dashboard Analytics Service ─────────────────────────────────────────────

export interface UnifiedDashboardData {
  totalAppointments: number;
  confirmedAppointments: number;
  cancelledAppointments: number;
  completedAppointments: number;
  pendingAppointments: number;
  noShowAppointments: number;
  rescheduledAppointments: number;
  totalRevenue: number;
  activeStaff: number;
  recentAppointments: any[];
  bookingTrends: {
    period: string;
    revenue: number;
    appointments: number;
  }[];
  statusDistribution: {
    status: string;
    count: number;
  }[];
  popularServices: {
    serviceName: string;
    bookingCount: number;
    revenue: number;
  }[];
}

export const dashboardService = {
  getUnifiedDashboard: async (params?: { businessId?: string }) => {
    const res = await api.get<{ success: true; data: UnifiedDashboardData }>('/dashboard', { params });
    return res.data.data;
  }
};
