import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';
import { UserRole } from '@prisma/client';
import { prisma } from '../prisma/client';
import { AppError } from '../utils/AppError';

export interface RequestContext {
  userId?: string;
  role?: UserRole;
  tenantId?: string; // Active businessId
}

// Global async storage to propagate request context (user and tenant ID)
export const contextStorage = new AsyncLocalStorage<RequestContext>();

// Regular expression to validate UUIDs
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function tenantContext(req: Request, _res: Response, next: NextFunction): Promise<void> {
  let tenantId: string | undefined = undefined;

  // 1. Resolve tenant ID (businessId) from headers, params, query, or body
  const headerTenantId = req.headers['x-tenant-id'] || req.headers['x-business-id'];
  if (headerTenantId && typeof headerTenantId === 'string') {
    tenantId = headerTenantId;
  } else if (req.params.businessId) {
    tenantId = req.params.businessId;
  } else if (req.query.businessId && typeof req.query.businessId === 'string') {
    tenantId = req.query.businessId;
  } else if (req.body && req.body.businessId && typeof req.body.businessId === 'string') {
    tenantId = req.body.businessId;
  }

  // Handle direct business routes: e.g. /businesses/:id -> req.params.id is the businessId
  if (!tenantId && req.baseUrl.includes('/businesses') && req.params.id) {
    tenantId = req.params.id;
  }

  // 2. Validate tenant if resolved
  if (tenantId) {
    if (!UUID_REGEX.test(tenantId)) {
      next(new AppError('Invalid tenant ID format', 400));
      return;
    }

    // Tenant validation: check if the business actually exists
    const business = await prisma.business.findUnique({
      where: { id: tenantId },
    });

    if (!business) {
      next(new AppError('Tenant not found', 404));
      return;
    }

    // Store resolved tenant ID on the Express Request object
    req.tenantId = tenantId;

    // 3. Enforce role-based access validation at the tenant boundary
    if (req.user) {
      const { id: userId, role } = req.user;

      if (role === UserRole.BUSINESS_OWNER) {
        // Business owner must own the resolved business
        if (business.ownerId !== userId) {
          next(new AppError('Access denied: You do not own this business tenant', 403));
          return;
        }
      } else if (role === UserRole.STAFF) {
        // Staff member must belong to the resolved business
        const staff = await prisma.staff.findFirst({
          where: {
            businessId: tenantId,
            userId: userId,
          },
        });

        if (!staff) {
          next(new AppError('Access denied: You are not staff at this business tenant', 403));
          return;
        }
      }
      // Note: SUPER_ADMIN has access to all tenants. CUSTOMER role is allowed to access
      // public business details/services, and their appointments are isolated at the database level.
    }
  }

  // 4. Wrap downstream request handling in the AsyncLocalStorage context
  const context: RequestContext = {
    userId: req.user?.id,
    role: req.user?.role,
    tenantId: tenantId,
  };

  contextStorage.run(context, () => {
    next();
  });
}
