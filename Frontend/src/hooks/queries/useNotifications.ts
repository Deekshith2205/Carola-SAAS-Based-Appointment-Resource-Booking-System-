import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import type { ApiSuccessResponse } from '../../types';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
}

export function useNotifications(params?: { page?: number; limit?: number; isRead?: boolean }) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: { notifications: Notification[]; pagination: unknown } }>(
        '/notifications',
        { params }
      );
      return res.data.data;
    },
    refetchInterval: 30_000, // poll every 30 s
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch<ApiSuccessResponse<{ notification: Notification }>>(`/notifications/${id}/read`);
      return res.data.data.notification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
