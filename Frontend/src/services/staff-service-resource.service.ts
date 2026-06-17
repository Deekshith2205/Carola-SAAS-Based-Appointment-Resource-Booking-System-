import { api } from './api';
import type { Staff, Service, Resource, ApiSuccessResponse, PaginatedResponse } from '../types';

// ─── Staff Service ───────────────────────────────────────────────────────────
export interface CreateStaffPayload {
  businessId: string;
  userId: string;
  designation?: string;
}

export interface UpdateStaffPayload {
  designation?: string;
  availabilityStatus?: string;
}

export const staffService = {
  listByBusiness: async (businessId: string, params?: { page?: number; limit?: number }) => {
    const res = await api.get<PaginatedResponse<Staff>>(`/staff/business/${businessId}`, { params });
    return res.data;
  },

  create: async (payload: CreateStaffPayload) => {
    const res = await api.post<ApiSuccessResponse<{ staff: Staff }>>('/staff', payload);
    return res.data.data.staff;
  },

  update: async (id: string, payload: UpdateStaffPayload) => {
    const res = await api.patch<ApiSuccessResponse<{ staff: Staff }>>(`/staff/${id}`, payload);
    return res.data.data.staff;
  },

  remove: async (id: string) => {
    await api.delete(`/staff/${id}`);
  },
};

// ─── Service (catalog) Service ───────────────────────────────────────────────
export interface CreateServicePayload {
  businessId: string;
  serviceName: string;
  durationMinutes: number;
  price: number;
  description?: string;
}

export interface UpdateServicePayload {
  serviceName?: string;
  durationMinutes?: number;
  price?: number;
  description?: string;
}

export const serviceService = {
  listByBusiness: async (businessId: string, params?: { page?: number; limit?: number }) => {
    const res = await api.get<PaginatedResponse<Service>>(`/services/business/${businessId}`, { params });
    return res.data;
  },

  create: async (payload: CreateServicePayload) => {
    const res = await api.post<ApiSuccessResponse<{ service: Service }>>('/services', payload);
    return res.data.data.service;
  },

  update: async (id: string, payload: UpdateServicePayload) => {
    const res = await api.patch<ApiSuccessResponse<{ service: Service }>>(`/services/${id}`, payload);
    return res.data.data.service;
  },

  remove: async (id: string) => {
    await api.delete(`/services/${id}`);
  },
};

// ─── Resource Service ────────────────────────────────────────────────────────
export interface CreateResourcePayload {
  businessId: string;
  resourceName: string;
  resourceType: string;
}

export interface UpdateResourcePayload {
  resourceName?: string;
  resourceType?: string;
  status?: string;
}

export const resourceService = {
  listByBusiness: async (businessId: string, params?: { page?: number; limit?: number }) => {
    const res = await api.get<PaginatedResponse<Resource>>(`/resources/business/${businessId}`, { params });
    return res.data;
  },

  create: async (payload: CreateResourcePayload) => {
    const res = await api.post<ApiSuccessResponse<{ resource: Resource }>>('/resources', payload);
    return res.data.data.resource;
  },

  update: async (id: string, payload: UpdateResourcePayload) => {
    const res = await api.patch<ApiSuccessResponse<{ resource: Resource }>>(`/resources/${id}`, payload);
    return res.data.data.resource;
  },

  remove: async (id: string) => {
    await api.delete(`/resources/${id}`);
  },
};
