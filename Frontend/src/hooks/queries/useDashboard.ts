import { useQuery } from '@tanstack/react-query';
import { dashboardService, type DashboardSummary, type RevenueTrend, type StaffUtilization, type PopularService, type StatusDistribution } from '../../services/dashboard.service';

interface DateRange {
  startDate?: string;
  endDate?: string;
  businessId?: string;
}

export function useDashboardSummary(params?: DateRange) {
  return useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary', params],
    queryFn: () => dashboardService.getSummary(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useRevenueTrends(params?: DateRange & { period?: 'daily' | 'weekly' | 'monthly' }) {
  return useQuery<RevenueTrend[]>({
    queryKey: ['dashboard', 'revenue-trends', params],
    queryFn: () => dashboardService.getRevenueTrends(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useStaffUtilization(params?: DateRange) {
  return useQuery<StaffUtilization[]>({
    queryKey: ['dashboard', 'staff-utilization', params],
    queryFn: () => dashboardService.getStaffUtilization(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function usePopularServices(params?: DateRange & { limit?: number }) {
  return useQuery<PopularService[]>({
    queryKey: ['dashboard', 'popular-services', params],
    queryFn: () => dashboardService.getPopularServices(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useStatusDistribution(params?: DateRange) {
  return useQuery<StatusDistribution[]>({
    queryKey: ['dashboard', 'status-distribution', params],
    queryFn: () => dashboardService.getStatusDistribution(params),
    staleTime: 2 * 60 * 1000,
  });
}
