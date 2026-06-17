import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import * as authService from '../services/auth.service';

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
