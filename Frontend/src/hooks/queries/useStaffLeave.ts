import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import type { ApiSuccessResponse } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface StaffLeave {
  id: string;
  staffId: string;
  startDate: string; // ISO date
  endDate: string;   // ISO date
  reason?: string;
  status: LeaveStatus;
  createdAt: string;
  staff?: {
    id: string;
    user?: { id: string; name: string; email: string };
  };
}

export interface RequestLeavePayload {
  staffId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface UpdateLeaveStatusPayload {
  status: 'APPROVED' | 'REJECTED' | 'CANCELLED';
}

interface LeaveListParams {
  staffId?: string;
  status?: LeaveStatus;
  page?: number;
  limit?: number;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** List leave requests with optional filters. */
export function useStaffLeave(params?: LeaveListParams) {
  return useQuery<{ leaves: StaffLeave[]; pagination: unknown }>({
    queryKey: ['staff-leave', params],
    queryFn: async () => {
      const res = await api.get<ApiSuccessResponse<{ leaves: StaffLeave[]; pagination: unknown }>>(
        '/staff-leave',
        { params }
      );
      return res.data.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

/** Get a single leave request by ID. */
export function useStaffLeaveById(id: string) {
  return useQuery<StaffLeave>({
    queryKey: ['staff-leave', id],
    queryFn: async () => {
      const res = await api.get<ApiSuccessResponse<{ leave: StaffLeave }>>(`/staff-leave/${id}`);
      return res.data.data.leave;
    },
    enabled: !!id,
  });
}

/** Request new leave. */
export function useRequestLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RequestLeavePayload) => {
      const res = await api.post<ApiSuccessResponse<{ leave: StaffLeave }>>('/staff-leave', payload);
      return res.data.data.leave;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-leave'] });
    },
  });
}

/** Update a leave request status (approve / reject / cancel). */
export function useUpdateLeaveStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateLeaveStatusPayload & { id: string }) => {
      const res = await api.patch<ApiSuccessResponse<{ leave: StaffLeave }>>(
        `/staff-leave/${id}/status`,
        payload
      );
      return res.data.data.leave;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-leave'] });
    },
  });
}
