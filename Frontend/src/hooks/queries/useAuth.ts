import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../../services/auth.service';
import type { UpdateProfilePayload, ChangePasswordPayload } from '../../services/auth.service';
import { useAuth as useAuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { LoginInput, RegisterInput } from '../../types';
import { getDefaultRouteForRole } from '../../utils/routeUtils';

export function useLogin() {
  const { login } = useAuthContext();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: LoginInput) => authService.login(data.email, data.password),
    onSuccess: (data) => {
      login(data.token, data.user);
      
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      navigate(getDefaultRouteForRole(data.user.role));
    },
  });
}

export function useRegister() {
  const { login } = useAuthContext();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: RegisterInput) => authService.register(data),
    onSuccess: (data) => {
      login(data.token, data.user);

      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      navigate(getDefaultRouteForRole(data.user.role));
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => authService.updateMe(payload),
    onSuccess: (updatedUser) => {
      // Update the cached user in AuthContext so the Navbar/UI updates immediately
      queryClient.setQueryData(['auth', 'me'], updatedUser);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => authService.changePassword(payload),
  });
}
