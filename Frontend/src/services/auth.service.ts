import { api } from './api';
import type { User, AuthResponse, ApiSuccessResponse } from '../types';

export interface UpdateProfilePayload {
  name?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await api.post<ApiSuccessResponse<AuthResponse>>('/auth/login', { email, password });
    return res.data.data;
  },

  register: async (payload: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }): Promise<AuthResponse> => {
    const res = await api.post<ApiSuccessResponse<AuthResponse>>('/auth/register', payload);
    return res.data.data;
  },

  me: async (): Promise<User> => {
    const res = await api.get<ApiSuccessResponse<{ user: User }>>('/auth/me');
    return res.data.data.user;
  },

  updateMe: async (payload: UpdateProfilePayload): Promise<User> => {
    const res = await api.patch<ApiSuccessResponse<{ user: User }>>('/auth/me', payload);
    return res.data.data.user;
  },

  changePassword: async (payload: ChangePasswordPayload): Promise<void> => {
    await api.patch('/auth/change-password', payload);
  },
};
