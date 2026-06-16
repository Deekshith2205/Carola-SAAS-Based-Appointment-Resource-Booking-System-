import jwt, { JwtPayload as JsonWebTokenPayload, SignOptions } from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { env } from '../config/env';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(
    { email: payload.email, role: payload.role },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
      subject: payload.sub,
    }
  );
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);

  if (typeof decoded === 'string' || !decoded.sub) {
    throw new Error('Invalid token payload');
  }

  const { email, role } = decoded as JsonWebTokenPayload & {
    email?: string;
    role?: UserRole;
  };

  if (!email || !role) {
    throw new Error('Invalid token payload');
  }

  return {
    sub: decoded.sub,
    email,
    role,
  };
}
