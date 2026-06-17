import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  staffService,
  serviceService,
  resourceService,
  type CreateStaffPayload,
  type UpdateStaffPayload,
  type CreateServicePayload,
  type UpdateServicePayload,
  type CreateResourcePayload,
  type UpdateResourcePayload,
} from '../services/staff-service-resource.service';

// ─── Staff Hooks ─────────────────────────────────────────────────────────────
export const staffKeys = {
  all: ['staff'] as const,
  byBusiness: (businessId: string, params?: object) =>
    [...staffKeys.all, 'business', businessId, params] as const,
};

export function useStaffByBusiness(
  businessId: string,
  params?: { page?: number; limit?: number },
  enabled = true
) {
  return useQuery({
    queryKey: staffKeys.byBusiness(businessId, params),
    queryFn: () => staffService.listByBusiness(businessId, params),
    enabled: enabled && !!businessId,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStaffPayload) => staffService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateStaffPayload }) =>
      staffService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
    },
  });
}

export function useRemoveStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => staffService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
    },
  });
}

// ─── Service (catalog) Hooks ─────────────────────────────────────────────────
export const serviceKeys = {
  all: ['services'] as const,
  byBusiness: (businessId: string, params?: object) =>
    [...serviceKeys.all, 'business', businessId, params] as const,
};

export function useServicesByBusiness(
  businessId: string,
  params?: { page?: number; limit?: number },
  enabled = true
) {
  return useQuery({
    queryKey: serviceKeys.byBusiness(businessId, params),
    queryFn: () => serviceService.listByBusiness(businessId, params),
    enabled: enabled && !!businessId,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateServicePayload) => serviceService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateServicePayload }) =>
      serviceService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
    },
  });
}

export function useRemoveService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => serviceService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
    },
  });
}

// ─── Resource Hooks ───────────────────────────────────────────────────────────
export const resourceKeys = {
  all: ['resources'] as const,
  byBusiness: (businessId: string, params?: object) =>
    [...resourceKeys.all, 'business', businessId, params] as const,
};

export function useResourcesByBusiness(
  businessId: string,
  params?: { page?: number; limit?: number },
  enabled = true
) {
  return useQuery({
    queryKey: resourceKeys.byBusiness(businessId, params),
    queryFn: () => resourceService.listByBusiness(businessId, params),
    enabled: enabled && !!businessId,
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateResourcePayload) => resourceService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.all });
    },
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateResourcePayload }) =>
      resourceService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.all });
    },
  });
}

export function useRemoveResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resourceService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.all });
    },
  });
}
