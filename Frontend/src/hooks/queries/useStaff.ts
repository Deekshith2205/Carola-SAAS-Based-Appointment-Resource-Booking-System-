import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { getBusinessId } from './useBusiness';
import type { Staff, ApiSuccessResponse } from '../../types';

export function useStaffList(params?: { page?: number; limit?: number }) {
  const businessId = getBusinessId();
  return useQuery({
    queryKey: ['staff', businessId, params],
    queryFn: async () => {
      if (!businessId) return { staff: [], pagination: null };
      const res = await api.get<{ success: boolean; data: { staff: Staff[]; pagination: unknown } }>(
        `/staff/business/${businessId}`,
        { params }
      );
      return res.data.data;
    },
    enabled: !!businessId,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; email: string; designation?: string; businessId: string }) => {
      const res = await api.post<ApiSuccessResponse<{ staff: Staff }>>('/staff', data);
      return res.data.data.staff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; designation?: string; availabilityStatus?: string }) => {
      const res = await api.patch<ApiSuccessResponse<{ staff: Staff }>>(`/staff/${id}`, data);
      return res.data.data.staff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/staff/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}
