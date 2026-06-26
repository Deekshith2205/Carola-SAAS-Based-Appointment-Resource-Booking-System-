import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { getBusinessId } from './useBusiness';
import type { Service, ApiSuccessResponse } from '../../types';

export function useServices(params?: { page?: number; limit?: number }) {
  const businessId = getBusinessId();
  return useQuery({
    queryKey: ['services', businessId, params],
    queryFn: async () => {
      if (!businessId) return { services: [], pagination: null };
      const res = await api.get<{ success: boolean; data: { services: Service[]; pagination: unknown } }>(
        `/services/business/${businessId}`,
        { params }
      );
      return res.data.data;
    },
    enabled: !!businessId,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { serviceName: string; durationMinutes: number; price: number; description?: string; businessId: string }) => {
      const res = await api.post<ApiSuccessResponse<{ service: Service }>>('/services', data);
      return res.data.data.service;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; serviceName?: string; durationMinutes?: number; price?: number; description?: string }) => {
      const res = await api.patch<ApiSuccessResponse<{ service: Service }>>(`/services/${id}`, data);
      return res.data.data.service;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}
