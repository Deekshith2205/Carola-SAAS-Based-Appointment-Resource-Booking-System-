import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import type { ApiSuccessResponse } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface StaffAvailability {
  id: string;
  staffId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // "HH:MM:SS"
  endTime: string;   // "HH:MM:SS"
  isAvailable: boolean;
}

export interface CreateAvailabilityPayload {
  staffId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isAvailable?: boolean;
}

export interface UpdateAvailabilityPayload {
  startTime?: string;
  endTime?: string;
  isAvailable?: boolean;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Fetch all availability windows for a specific staff member. */
export function useStaffAvailability(staffId: string | undefined) {
  return useQuery<StaffAvailability[]>({
    queryKey: ['staff-availability', staffId],
    queryFn: async () => {
      const res = await api.get<ApiSuccessResponse<{ availability: StaffAvailability[] }>>(
        `/staff-availability/${staffId}`
      );
      return res.data.data.availability;
    },
    enabled: !!staffId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Set (create) a new availability window. */
export function useSetAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateAvailabilityPayload) => {
      const res = await api.post<ApiSuccessResponse<{ availability: StaffAvailability }>>(
        '/staff-availability',
        payload
      );
      return res.data.data.availability;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff-availability', variables.staffId] });
    },
  });
}

/** Update an existing availability window. */
export function useUpdateAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, staffId, ...payload }: UpdateAvailabilityPayload & { id: string; staffId: string }) => {
      const res = await api.patch<ApiSuccessResponse<{ availability: StaffAvailability }>>(
        `/staff-availability/${id}`,
        payload
      );
      return res.data.data.availability;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff-availability', variables.staffId] });
    },
  });
}

/** Delete an availability window. */
export function useDeleteAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; staffId: string }) => {
      await api.delete(`/staff-availability/${id}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff-availability', variables.staffId] });
    },
  });
}
