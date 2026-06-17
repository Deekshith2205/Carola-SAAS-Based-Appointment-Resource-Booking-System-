import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentService, CreateAppointmentPayload, UpdateAppointmentPayload } from '../services/appointment.service';

export const appointmentKeys = {
  all: ['appointments'] as const,
  list: (params?: object) => [...appointmentKeys.all, 'list', params] as const,
  detail: (id: string) => [...appointmentKeys.all, 'detail', id] as const,
};

export function useAppointments(params?: { page?: number; limit?: number; businessId?: string }) {
  return useQuery({
    queryKey: appointmentKeys.list(params),
    queryFn: () => appointmentService.list(params),
  });
}

export function useAppointment(id: string) {
  return useQuery({
    queryKey: appointmentKeys.detail(id),
    queryFn: () => appointmentService.getById(id),
    enabled: !!id,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAppointmentPayload) => appointmentService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}

export function useUpdateAppointment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateAppointmentPayload) => appointmentService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => appointmentService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}
