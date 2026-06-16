import { UserRole } from '@prisma/client';
import { injectTenantFilter, basePrisma, prisma } from './src/prisma/client';
import { tenantContext } from './src/middleware/tenant.middleware';
import { AppError } from './src/utils/AppError';
import { Request, Response } from 'express';

// Setup Mock Request & Response helpers
function mockRequest(options: Partial<Request> = {}): Request {
  return {
    headers: {},
    params: {},
    query: {},
    body: {},
    baseUrl: '',
    ...options,
  } as unknown as Request;
}

function mockResponse(): { res: Response; statusCalledWith: number | null; jsonCalledWith: any | null } {
  const mockRes = {
    statusCalledWith: null,
    jsonCalledWith: null,
  } as any;

  mockRes.res = {
    status(code: number) {
      mockRes.statusCalledWith = code;
      return this;
    },
    json(data: any) {
      mockRes.jsonCalledWith = data;
      return this;
    },
  } as unknown as Response;

  return mockRes;
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTests() {
  console.log('--- STARTING IN-MEMORY TENANT ISOLATION TESTS ---');

  // Define test constant IDs
  const ownerIdA = '11111111-1111-1111-1111-111111111111';
  const ownerIdB = '22222222-2222-2222-2222-222222222222';
  const staffIdA = '33333333-3333-3333-3333-333333333333';
  const customerIdA = '44444444-4444-4444-4444-444444444444';
  const businessIdA = '55555555-5555-5555-5555-555555555555';
  const businessIdB = '66666666-6666-6666-6666-666666666666';

  // -------------------------------------------------------------------------
  // TEST SECTION A: PRISMA QUERY FILTER INJECTIONS (injectTenantFilter)
  // -------------------------------------------------------------------------
  console.log('\n--- Running Prisma Query Filter Tests ---');

  // Test A1: Super Admin with no tenantId (should return empty filter)
  {
    const ctx = { userId: 'admin-id', role: UserRole.SUPER_ADMIN };
    const filter = injectTenantFilter('Business', {}, ctx);
    assert(Object.keys(filter).length === 0, 'Super admin without tenant ID should have no filters injected');
    console.log('✅ Test A1 Passed: Super Admin without tenant has no filters');
  }

  // Test A2: Super Admin with tenantId (should filter by tenantId)
  {
    const ctx = { userId: 'admin-id', role: UserRole.SUPER_ADMIN, tenantId: businessIdA };
    const filter = injectTenantFilter('Service', {}, ctx);
    assert(filter.businessId === businessIdA, 'Super Admin with tenant ID should filter by businessId');
    console.log('✅ Test A2 Passed: Super Admin with tenant is correctly filtered');
  }

  // Test A3: Business Owner A Queries (should filter by ownerId and businessId)
  {
    const ctx = { userId: ownerIdA, role: UserRole.BUSINESS_OWNER, tenantId: businessIdA };

    // Business
    const bFilter = injectTenantFilter('Business', {}, ctx);
    assert(bFilter.ownerId === ownerIdA, 'Owner must be filtered by ownerId');
    assert(bFilter.id === businessIdA, 'Owner must be filtered by active tenant id');

    // Service
    const sFilter = injectTenantFilter('Service', {}, ctx);
    assert(sFilter.businessId === businessIdA, 'Service must filter by businessId');
    assert(sFilter.business.ownerId === ownerIdA, 'Service must filter by business ownerId');

    // Appointment
    const appFilter = injectTenantFilter('Appointment', {}, ctx);
    assert(appFilter.businessId === businessIdA, 'Appointment must filter by businessId');
    assert(appFilter.business.ownerId === ownerIdA, 'Appointment must filter by business ownerId');

    console.log('✅ Test A3 Passed: Business Owner filters are correctly injected');
  }

  // Test A4: Staff A Queries (should filter by business association and appointments)
  {
    const ctx = { userId: staffIdA, role: UserRole.STAFF, tenantId: businessIdA };

    // Service
    const sFilter = injectTenantFilter('Service', {}, ctx);
    assert(sFilter.businessId === businessIdA, 'Staff must see services of the active tenant');
    assert(sFilter.business.staff.some.userId === staffIdA, 'Staff must belong to the business');

    // Appointment
    const appFilter = injectTenantFilter('Appointment', {}, ctx);
    assert(appFilter.staff.userId === staffIdA, 'Staff can only see appointments assigned to them');

    console.log('✅ Test A4 Passed: Staff filters are correctly injected');
  }

  // Test A5: Customer A Queries (should only see their own appointments)
  {
    const ctx = { userId: customerIdA, role: UserRole.CUSTOMER };

    // Appointment
    const appFilter = injectTenantFilter('Appointment', {}, ctx);
    assert(appFilter.customerId === customerIdA, 'Customer can only see their own appointments');

    // Service (no read filter for customers)
    const sFilter = injectTenantFilter('Service', {}, ctx);
    assert(Object.keys(sFilter).length === 0, 'Customer has no read restrictions on Service model');

    console.log('✅ Test A5 Passed: Customer filters are correctly injected');
  }

  // -------------------------------------------------------------------------
  // TEST SECTION B: EXPRESS MIDDLEWARE TENANT VALIDATION
  // -------------------------------------------------------------------------
  console.log('\n--- Running Middleware Validation Tests (Mocked DB) ---');

  // Mock database findUnique and findFirst for validation
  const mockBusinesses = new Map<string, any>([
    [businessIdA, { id: businessIdA, ownerId: ownerIdA, businessName: 'Gym A' }],
    [businessIdB, { id: businessIdB, ownerId: ownerIdB, businessName: 'Salon B' }],
  ]);

  const mockStaff = new Map<string, any>([
    [`${businessIdA}-${staffIdA}`, { businessId: businessIdA, userId: staffIdA }],
  ]);

  // Intercept database operations on prisma for unit testing
  (prisma as any).business.findUnique = (async (args: any) => {
    return mockBusinesses.get(args.where.id) || null;
  }) as any;

  (prisma as any).staff.findFirst = (async (args: any) => {
    const key = `${args.where.businessId}-${args.where.userId}`;
    return mockStaff.get(key) || null;
  }) as any;

  // Intercept database operations on basePrisma for unit testing
  basePrisma.business.findUnique = (async (args: any) => {
    return mockBusinesses.get(args.where.id) || null;
  }) as any;

  basePrisma.staff.findFirst = (async (args: any) => {
    const key = `${args.where.businessId}-${args.where.userId}`;
    return mockStaff.get(key) || null;
  }) as any;

  // Test B1: Guest accessing Business A (should pass)
  {
    const req = mockRequest({
      headers: { 'x-tenant-id': businessIdA },
    });
    const { res } = mockResponse();
    let nextCalled = false;
    let nextError: any = null;

    await tenantContext(req, res, (err?: any) => {
      nextCalled = true;
      nextError = err;
    });

    if (nextError) {
      console.log('Error details:', nextError);
    }
    assert(nextCalled === true, 'Next should be called');
    assert(!nextError, 'Should not return error for guest');
    assert(req.tenantId === businessIdA, 'req.tenantId should be resolved');
    console.log('✅ Test B1 Passed: Guest can access Business A details');
  }

  // Test B2: Owner A accessing Business A (should pass)
  {
    const req = mockRequest({
      headers: { 'x-tenant-id': businessIdA },
      user: { id: ownerIdA, email: 'ownerA@test.local', role: UserRole.BUSINESS_OWNER },
    });
    const { res } = mockResponse();
    let nextCalled = false;
    let nextError: any = null;

    await tenantContext(req, res, (err?: any) => {
      nextCalled = true;
      nextError = err;
    });

    assert(nextCalled === true, 'Next should be called');
    assert(!nextError, 'Owner A should be allowed to access Business A');
    console.log('✅ Test B2 Passed: Owner A can access Business A');
  }

  // Test B3: Owner A accessing Business B (should fail 403)
  {
    const req = mockRequest({
      headers: { 'x-tenant-id': businessIdB },
      user: { id: ownerIdA, email: 'ownerA@test.local', role: UserRole.BUSINESS_OWNER },
    });
    const { res } = mockResponse();
    let nextError: any = null;

    await tenantContext(req, res, (err?: any) => {
      nextError = err;
    });

    assert(nextError instanceof AppError, 'Should return error');
    assert(nextError.statusCode === 403, 'Owner A should be blocked from Business B (403)');
    console.log('✅ Test B3 Passed: Owner A is blocked from Business B');
  }

  // Test B4: Staff A accessing Business A (should pass)
  {
    const req = mockRequest({
      headers: { 'x-tenant-id': businessIdA },
      user: { id: staffIdA, email: 'staffA@test.local', role: UserRole.STAFF },
    });
    const { res } = mockResponse();
    let nextError: any = null;

    await tenantContext(req, res, (err?: any) => {
      nextError = err;
    });

    assert(!nextError, 'Staff A should be allowed to access Business A');
    console.log('✅ Test B4 Passed: Staff A can access Business A');
  }

  // Test B5: Staff A accessing Business B (should fail 403)
  {
    const req = mockRequest({
      headers: { 'x-tenant-id': businessIdB },
      user: { id: staffIdA, email: 'staffA@test.local', role: UserRole.STAFF },
    });
    const { res } = mockResponse();
    let nextError: any = null;

    await tenantContext(req, res, (err?: any) => {
      nextError = err;
    });

    assert(nextError instanceof AppError, 'Should return error');
    assert(nextError.statusCode === 403, 'Staff A should be blocked from Business B (403)');
    console.log('✅ Test B5 Passed: Staff A is blocked from Business B');
  }

  // Test B6: Invalid Tenant ID format (should fail 400)
  {
    const req = mockRequest({
      headers: { 'x-tenant-id': 'invalid-uuid-format' },
    });
    const { res } = mockResponse();
    let nextError: any = null;

    await tenantContext(req, res, (err?: any) => {
      nextError = err;
    });

    assert(nextError instanceof AppError, 'Should return error');
    assert(nextError.statusCode === 400, 'Invalid UUID should return 400');
    console.log('✅ Test B6 Passed: Invalid tenant format returns 400');
  }

  // Test B7: Non-existent Tenant ID (should fail 404)
  {
    const req = mockRequest({
      headers: { 'x-tenant-id': '00000000-0000-0000-0000-000000000000' },
    });
    const { res } = mockResponse();
    let nextError: any = null;

    await tenantContext(req, res, (err?: any) => {
      nextError = err;
    });

    assert(nextError instanceof AppError, 'Should return error');
    assert(nextError.statusCode === 404, 'Non-existent tenant should return 404');
    console.log('✅ Test B7 Passed: Non-existent tenant returns 404');
  }

  console.log('\n🎉 ALL IN-MEMORY INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉');
}

runTests().catch((error) => {
  console.error('\n❌ TEST RUN FAILED:', error);
  process.exit(1);
});
