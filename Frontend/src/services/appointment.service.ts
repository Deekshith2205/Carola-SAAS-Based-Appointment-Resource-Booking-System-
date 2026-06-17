import { api } from './api';
import type { Appointment, ApiSuccessResponse, PaginatedResponse } from '../types';

export interface CreateAppointmentPayload {
  businessId: string;
  serviceId: string;
  staffId?: string;
  resourceId?: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
}

export interface UpdateAppointmentPayload {
  status?: string;
  appointmentDate?: string;
  startTime?: string;
  endTime?: string;
  staffId?: string;
  resourceId?: string;
}

export const appointmentService = {
  list: async (params?: { page?: number; limit?: number; businessId?: string }) => {
    const res = await api.get<PaginatedResponse<Appointment>>('/appointments', { params });
    return res.data;
  },

  getById: async (id: string) => {
    const res = await api.get<ApiSuccessResponse<{ appointment: Appointment }>>(`/appointments/${id}`);
    return res.data.data.appointment;
  },

  create: async (payload: CreateAppointmentPayload) => {
    const res = await api.post<ApiSuccessResponse<{ appointment: Appointment }>>('/appointments', payload);
    return res.data.data.appointment;
  },

  update: async (id: string, payload: UpdateAppointmentPayload) => {
    const res = await api.patch<ApiSuccessResponse<{ appointment: Appointment }>>(`/appointments/${id}`, payload);
    return res.data.data.appointment;
  },

  cancel: async (id: string) => {
    const res = await api.patch<ApiSuccessResponse<{ appointment: Appointment }>>(`/appointments/${id}/cancel`);
    return res.data.data.appointment;
  },
};
