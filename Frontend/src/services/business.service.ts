import { api } from './api';
import type { Business, ApiSuccessResponse, PaginatedResponse } from '../types';

export const businessService = {
  list: async (params?: { page?: number; limit?: number }) => {
    const res = await api.get<PaginatedResponse<Business>>('/businesses', { params });
    return res.data;
  },

  getById: async (id: string) => {
    const res = await api.get<ApiSuccessResponse<{ business: Business }>>(`/businesses/${id}`);
    return res.data.data.business;
  },

  create: async (payload: Partial<Business>) => {
    const res = await api.post<ApiSuccessResponse<{ business: Business }>>('/businesses', payload);
    return res.data.data.business;
  },

  update: async (id: string, payload: Partial<Business>) => {
    const res = await api.patch<ApiSuccessResponse<{ business: Business }>>(`/businesses/${id}`, payload);
    return res.data.data.business;
  },
};

// Super Admin business management
export const superAdminService = {
  listAllBusinesses: async (params?: { page?: number; limit?: number }) => {
    const res = await api.get<PaginatedResponse<Business>>('/super-admin/businesses', { params });
    return res.data;
  },

  activateBusiness: async (id: string) => {
    const res = await api.patch<ApiSuccessResponse<{ business: Business }>>(`/super-admin/businesses/${id}/activate`);
    return res.data.data.business;
  },

  suspendBusiness: async (id: string) => {
    const res = await api.patch<ApiSuccessResponse<{ business: Business }>>(`/super-admin/businesses/${id}/suspend`);
    return res.data.data.business;
  },

  getStatistics: async () => {
    const res = await api.get<ApiSuccessResponse<{
      statistics: {
        totalUsers: number;
        totalBusinesses: number;
        totalResources: number;
        totalAppointments: number;
      };
    }>>('/super-admin/statistics');
    return res.data.data.statistics;
  },
};
