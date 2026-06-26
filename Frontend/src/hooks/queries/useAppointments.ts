import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import type { Appointment, ApiSuccessResponse } from '../../types';

interface AppointmentListParams {
  page?: number;
  limit?: number;
  status?: string;
  businessId?: string;
  staffId?: string;
  customerId?: string;
  appointmentDate?: string;
}

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
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Appointment> & { id: string }) => {
      const res = await api.patch<ApiSuccessResponse<{ appointment: Appointment }>>(`/appointments/${id}`, data);
      return res.data.data.appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
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
    },
  });
}
