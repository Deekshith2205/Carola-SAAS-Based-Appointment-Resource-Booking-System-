import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import * as authService from '../services/auth.service';
import type { UpdateProfileInput } from '../validations/auth.validation';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.registerUser(req.body);

  req.auditLog = { action: 'REGISTER', entity: 'User', entityId: result.user.id };

  sendSuccess(res, result, {
    message: 'Registration successful',
    statusCode: 201,
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.loginUser(req.body);

  req.auditLog = { action: 'LOGIN', entity: 'User', entityId: result.user.id };

  sendSuccess(res, result, { message: 'Login successful' });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getUserProfile(req.user!.id);

  sendSuccess(res, { user });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return sendSuccess(res, null, { message: 'Refresh token required', statusCode: 400 });
  }

  const result = await authService.refreshUserToken(refreshToken);

  sendSuccess(res, result, { message: 'Token refreshed successfully' });
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as UpdateProfileInput;
  const user = await authService.updateUserProfile(req.user!.id, input);
  sendSuccess(res, { user }, { message: 'Profile updated successfully' });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.changeUserPassword(req.user!.id, req.body);

  req.auditLog = { action: 'OTHER', entity: 'User', entityId: req.user!.id };

  sendSuccess(res, null, { message: 'Password changed successfully' });
});
