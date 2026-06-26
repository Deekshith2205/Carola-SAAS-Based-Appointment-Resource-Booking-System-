import { useQuery } from '@tanstack/react-query';
import { dashboardService, type UnifiedDashboardData } from '../../services/dashboard.service';

interface DashboardQuery {
  businessId?: string;
}

export function useUnifiedDashboard(params?: DashboardQuery) {
  return useQuery<UnifiedDashboardData>({
    queryKey: ['dashboard', params],
    queryFn: () => dashboardService.getUnifiedDashboard(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
