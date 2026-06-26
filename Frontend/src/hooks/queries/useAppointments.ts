import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import type { Appointment, AppointmentStatus, ApiSuccessResponse } from '../../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AppointmentListParams {
  page?: number;
  limit?: number;
  status?: string;
  businessId?: string;
  staffId?: string;
  customerId?: string;
  appointmentDate?: string;
}

interface UpdateAppointmentPayload {
  staffId?: string | null;
  resourceId?: string | null;
  /** YYYY-MM-DD or ISO string — backend normalises to YYYY-MM-DD */
  appointmentDate?: string;
  startTime?: string;
  endTime?: string;
  status?: AppointmentStatus;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useAppointments(params?: AppointmentListParams) {
  return useQuery({
    queryKey: ['appointments', params],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: { appointments: Appointment[]; pagination: unknown } }>(
        '/appointments',
        { params }
      );
      return res.data.data;
    },
  });
}

export function useAppointmentById(id: string) {
  return useQuery({
    queryKey: ['appointments', id],
    queryFn: async () => {
      const res = await api.get<ApiSuccessResponse<{ appointment: Appointment }>>(`/appointments/${id}`);
      return res.data.data.appointment;
    },
    enabled: !!id,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      businessId: string;
      serviceId: string;
      staffId?: string;
      resourceId?: string;
      appointmentDate: string;
      startTime: string;
      endTime: string;
    }) => {
      const res = await api.post<ApiSuccessResponse<{ appointment: Appointment }>>('/appointments', data);
      return res.data.data.appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * General appointment update (schedule, staff, resource, or status together).
 * Uses PATCH /appointments/:id with the full update schema.
 */
export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateAppointmentPayload & { id: string }) => {
      const res = await api.patch<ApiSuccessResponse<{ appointment: Appointment }>>(
        `/appointments/${id}`,
        data
      );
      return res.data.data.appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Status-only appointment update.
 * Uses the dedicated PATCH /appointments/:id/status endpoint which:
 *  - Only validates { status }
 *  - Enforces business-rule transition validation on the backend
 *  - Is never blocked by date/time validation issues
 */
export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AppointmentStatus }) => {
      const res = await api.patch<ApiSuccessResponse<{ appointment: Appointment }>>(
        `/appointments/${id}/status`,
        { status }
      );
      return res.data.data.appointment;
    },
    onSuccess: () => {
      // Broad invalidation: catches all query key variants (with params, without, etc.)
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: () => {
      // Let the caller handle error display via the returned error object
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch<ApiSuccessResponse<{ appointment: Appointment }>>(`/appointments/${id}/cancel`);
      return res.data.data.appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
