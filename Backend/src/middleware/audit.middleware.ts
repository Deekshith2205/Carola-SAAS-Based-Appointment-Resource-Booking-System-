import { Request, Response, NextFunction } from 'express';
import { basePrisma } from '../prisma/client';

export type AuditAction = 'LOGIN' | 'REGISTER' | 'BUSINESS_CREATION' | 'BUSINESS_UPDATE' | 'STAFF_CREATION' | 'STAFF_UPDATE' | 'RESOURCE_CREATION' | 'RESOURCE_UPDATE' | 'APPOINTMENT_CREATION' | 'APPOINTMENT_UPDATE' | 'APPOINTMENT_CANCELLATION' | 'RESOURCE_MODIFICATION' | 'OTHER';

export interface AuditLogDetails {
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  details?: Record<string, any>;
}

declare global {
  namespace Express {
    interface Request {
      auditLog?: AuditLogDetails;
    }
  }
}

/**
 * Middleware to track audit logs.
 * Actions should attach `req.auditLog` with the required details before the response finishes.
 */
export const auditMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.on('finish', async () => {
    // Only log if an audit action was specified during the request lifecycle
    // and the request was generally successful
    if (req.auditLog && res.statusCode >= 200 && res.statusCode < 400) {
      try {
        const { action, entity, entityId, details } = req.auditLog;
        const userId = req.user?.id || null;

        await (basePrisma as any).auditLog.create({
          data: {
            userId,
            action,
            entity,
            entityId,
            details: details ? (details as any) : undefined,
          },
        });
      } catch (error) {
        console.error('Failed to create audit log:', error);
      }
    }
  });

  next();
};

/**
 * Helper to wrap specific routes with a static audit log context, useful if
 * the action and entity are statically known.
 */
export const withAudit = (action: AuditAction, entity: string) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.auditLog = { action, entity };
    next();
  };
};
