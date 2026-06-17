import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { businessService, superAdminService } from '../services/business.service';

export const businessKeys = {
  all: ['businesses'] as const,
  list: (params?: object) => [...businessKeys.all, 'list', params] as const,
  detail: (id: string) => [...businessKeys.all, 'detail', id] as const,
  stats: ['super-admin', 'stats'] as const,
};

export function useBusinesses(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: businessKeys.list(params),
    queryFn: () => businessService.list(params),
  });
}

export function useBusiness(id: string) {
  return useQuery({
    queryKey: businessKeys.detail(id),
    queryFn: () => businessService.getById(id),
    enabled: !!id,
  });
}

// Super Admin hooks
export function useAllBusinesses(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...businessKeys.all, 'admin', params],
    queryFn: () => superAdminService.listAllBusinesses(params),
  });
}

export function usePlatformStatistics() {
  return useQuery({
    queryKey: businessKeys.stats,
    queryFn: () => superAdminService.getStatistics(),
  });
}

export function useActivateBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => superAdminService.activateBusiness(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessKeys.all });
    },
  });
}

export function useSuspendBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => superAdminService.suspendBusiness(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessKeys.all });
    },
  });
}
