import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { getBusinessId } from './useBusiness';
import type { Resource, ApiSuccessResponse } from '../../types';

export function useResources(params?: { page?: number; limit?: number; status?: string }) {
  const businessId = getBusinessId();
  return useQuery({
    queryKey: ['resources', businessId, params],
    queryFn: async () => {
      if (!businessId) return { resources: [], pagination: null };
      const res = await api.get<{ success: boolean; data: { resources: Resource[]; pagination: unknown } }>(
        `/resources/business/${businessId}`,
        { params }
      );
      return res.data.data;
    },
    enabled: !!businessId,
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Resource> & { businessId: string }) => {
      const res = await api.post<ApiSuccessResponse<{ resource: Resource }>>('/resources', data);
      return res.data.data.resource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Resource> & { id: string }) => {
      const res = await api.patch<ApiSuccessResponse<{ resource: Resource }>>(`/resources/${id}`, data);
      return res.data.data.resource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/resources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}
