/**
 * useBusiness – fetches the current user's business profile.
 *
 * The backend uses `x-tenant-id` header for multi-tenancy. For a BUSINESS_OWNER
 * we first call /businesses to get their own business, then store its ID in
 * localStorage so the Axios instance can attach it automatically.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import type { Business, ApiSuccessResponse } from '../../types';

// ─── helpers ──────────────────────────────────────────────────────────────────

export function getBusinessId(): string | null {
  return localStorage.getItem('businessId');
}

export function setBusinessId(id: string) {
  localStorage.setItem('businessId', id);
}

// ─── hooks ────────────────────────────────────────────────────────────────────

/** Fetch the business list (owner sees their own business). */
export function useMyBusiness() {
  return useQuery({
    queryKey: ['business', 'mine'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: { businesses: Business[]; pagination: unknown } }>('/businesses');
      const list: Business[] = res.data.data.businesses ?? [];
      if (list.length > 0) setBusinessId(list[0].id);
      return list[0] ?? null;
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

/** Create a new business. */
export function useCreateBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Business>) => {
      const res = await api.post<ApiSuccessResponse<{ business: Business }>>('/businesses', data);
      return res.data.data.business;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] });
    },
  });
}

/** Update business info. */
export function useUpdateBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Business> & { id: string }) => {
      const res = await api.patch<ApiSuccessResponse<{ business: Business }>>(`/businesses/${id}`, data);
      return res.data.data.business;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business'] });
    },
  });
}
