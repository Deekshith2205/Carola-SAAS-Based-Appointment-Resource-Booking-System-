import { PrismaClient, UserRole } from '@prisma/client';
import { contextStorage, RequestContext } from '../middleware/tenant.middleware';
import { AppError } from '../utils/AppError';

export type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Base client for direct database interactions and bypass checks
export const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = basePrisma;
}

// Models subject to multi-tenant isolation
export const ISOLATED_MODELS = ['Business', 'Staff', 'Service', 'Resource', 'Appointment', 'StaffAvailability', 'StaffLeave'];

/**
 * Injects role-based and tenant-based filters into the query's where clause.
 */
export function injectTenantFilter(
  model: string,
  where: any = {},
  ctx: Required<Omit<RequestContext, 'tenantId'>> & { tenantId?: string }
) {
  const { userId, role, tenantId } = ctx;

  // 1. SUPER_ADMIN: Can access any record. Filter only if tenantId is explicitly provided.
  if (role === UserRole.SUPER_ADMIN) {
    if (tenantId && ISOLATED_MODELS.includes(model)) {
      if (model === 'Business') {
        return { ...where, id: tenantId };
      } else if (model === 'StaffAvailability' || model === 'StaffLeave') {
        return { ...where, staff: { businessId: tenantId } };
      } else {
        return { ...where, businessId: tenantId };
      }
    }
    return where;
  }

  // 2. BUSINESS_OWNER: Must only access records belonging to their business.
  if (role === UserRole.BUSINESS_OWNER) {
    switch (model) {
      case 'Business':
        return {
          ...where,
          ...(tenantId ? { id: tenantId } : {}),
          ownerId: userId,
        };
      case 'Staff':
      case 'Service':
      case 'Resource':
      case 'Appointment':
        return {
          ...where,
          ...(tenantId ? { businessId: tenantId } : {}),
          business: { ownerId: userId },
        };
      case 'StaffAvailability':
      case 'StaffLeave':
        return {
          ...where,
          ...(tenantId ? { staff: { businessId: tenantId } } : {}),
          staff: { business: { ownerId: userId } },
        };
      default:
        return where;
    }
  }

  // 3. STAFF: Can only access records belonging to their business, and appointments assigned to them.
  if (role === UserRole.STAFF) {
    switch (model) {
      case 'Business':
        return {
          ...where,
          ...(tenantId ? { id: tenantId } : {}),
          staff: { some: { userId } },
        };
      case 'Staff':
      case 'Service':
      case 'Resource':
        return {
          ...where,
          ...(tenantId ? { businessId: tenantId } : {}),
          business: { staff: { some: { userId } } },
        };
      case 'StaffAvailability':
      case 'StaffLeave':
        return {
          ...where,
          ...(tenantId ? { staff: { businessId: tenantId } } : {}),
          staff: { userId },
        };
      case 'Appointment':
        return {
          ...where,
          staff: { userId },
        };
      default:
        return where;
    }
  }

  // 4. CUSTOMER: Can only access their own appointments. Public resources (Business, Service, Resource, Staff) can be read.
  if (role === UserRole.CUSTOMER) {
    switch (model) {
      case 'Appointment':
        return {
          ...where,
          customerId: userId,
        };
      default:
        return where;
    }
  }

  return where;
}

// Export the extended Prisma Client that intercepts queries
export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!ISOLATED_MODELS.includes(model)) {
          return query(args);
        }

        const ctx = contextStorage.getStore();
        if (!ctx || !ctx.userId || !ctx.role) {
          // If no authenticated context exists, delegate directly to basePrisma
          // to allow mock overrides and bypass database calls during testing or seeding.
          const baseModel = (basePrisma as any)[model.toLowerCase()];
          if (baseModel && typeof baseModel[operation] === 'function') {
            return baseModel[operation](args);
          }
          return query(args);
        }

        const { userId, role } = ctx;

        // 1. Convert findUnique to findFirst on the base client to allow relationship-based filters
        if (operation === 'findUnique') {
          const findFirstArgs = {
            ...args,
            where: injectTenantFilter(model, args.where || {}, ctx as any),
          };
          return (basePrisma as any)[model.toLowerCase()].findFirst(findFirstArgs);
        }

        // 2. Intercept update/delete to verify access first
        if (operation === 'update' || operation === 'delete') {
          const filter = injectTenantFilter(model, args.where || {}, ctx as any);
          const accessible = await (basePrisma as any)[model.toLowerCase()].findFirst({ where: filter });
          if (!accessible) {
            throw new AppError(`${model} not found or access denied`, 403);
          }
          return (basePrisma as any)[model.toLowerCase()][operation](args);
        }

        // 3. Intercept create to verify tenant boundaries
        if (operation === 'create') {
          if (role !== UserRole.SUPER_ADMIN) {
            if (['Staff', 'Service', 'Resource', 'Appointment'].includes(model)) {
              const businessId = (args.data as any).businessId;
              if (!businessId) {
                throw new AppError('Business ID is required', 400);
              }

              if (role === UserRole.BUSINESS_OWNER) {
                const business = await basePrisma.business.findFirst({
                  where: { id: businessId, ownerId: userId },
                });
                if (!business) {
                  throw new AppError('Business not found or access denied', 403);
                }
              } else if (role === UserRole.STAFF) {
                const staff = await basePrisma.staff.findFirst({
                  where: { businessId, userId },
                });
                if (!staff) {
                  throw new AppError('Access denied: You are not staff at this business tenant', 403);
                }
              } else if (role === UserRole.CUSTOMER) {
                const business = await basePrisma.business.findUnique({
                  where: { id: businessId },
                });
                if (!business) {
                  throw new AppError('Business not found', 404);
                }
                if (model === 'Appointment' && args.data.customerId !== userId) {
                  throw new AppError('Cannot book appointment for another customer', 403);
                }
              }
            } else if (model === 'Business') {
              if (role === UserRole.BUSINESS_OWNER && args.data.ownerId !== userId) {
                throw new AppError('Cannot create a business for another owner', 403);
              }
            } else if (['StaffAvailability', 'StaffLeave'].includes(model)) {
              const staffId = (args.data as any).staffId;
              if (!staffId) {
                throw new AppError('Staff ID is required', 400);
              }

              const staff = await basePrisma.staff.findUnique({
                where: { id: staffId },
                include: { business: true },
              });

              if (!staff) {
                throw new AppError('Staff not found', 404);
              }

              if (role === UserRole.BUSINESS_OWNER) {
                if (staff.business.ownerId !== userId) {
                  throw new AppError('Staff not found or access denied', 403);
                }
              } else if (role === UserRole.STAFF) {
                if (staff.userId !== userId) {
                  throw new AppError('Cannot create record for another staff', 403);
                }
              }
            }
          }
          return (basePrisma as any)[model.toLowerCase()][operation](args);
        }

        // 4. For other read/write operations (findFirst, findMany, count, updateMany, deleteMany),
        // inject query filters.
        if (['findFirst', 'findMany', 'count', 'updateMany', 'deleteMany'].includes(operation)) {
          (args as any).where = injectTenantFilter(model, (args as any).where || {}, ctx as any);
        }

        return (basePrisma as any)[model.toLowerCase()][operation](args);
      },
    },
  },
});

export async function disconnectPrisma(): Promise<void> {
  await basePrisma.$disconnect();
}
