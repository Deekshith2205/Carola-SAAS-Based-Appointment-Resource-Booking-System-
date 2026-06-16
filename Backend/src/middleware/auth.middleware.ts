import { NextFunction, Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';
import { verifyToken } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
      };
      tenantId?: string;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next(new AppError('Authentication required', 401));
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token expired', 401));
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401));
      return;
    }

    next(new AppError('Authentication failed', 401));
  }
}

/** Role-based access control — restrict routes to specific UserRole values. */
export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentication required', 401));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new AppError('Insufficient permissions', 403));
      return;
    }

    next();
  };
}
