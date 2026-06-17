import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt';

/** Attach user when a valid Bearer token is present; continue as guest otherwise. */
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }

  try {
    const payload = verifyToken(authHeader.slice(7));
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    // Invalid token on public routes — treat as unauthenticated guest
  }

  next();
}
