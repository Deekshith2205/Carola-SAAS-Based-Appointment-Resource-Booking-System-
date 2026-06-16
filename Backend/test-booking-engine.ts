import { AvailabilityStatus, AppointmentStatus, ResourceStatus, UserRole } from '@prisma/client';
import {
  BookingValidationError,
  BookingContext,
  validateAppointmentBooking,
  validateDuration,
  assertNoStaffDoubleBooking,
  assertNoResourceDoubleBooking,
  assertNoCustomerDoubleBooking,
} from './src/services/appointmentBooking.validator';
import { ACTIVE_APPOINTMENT_STATUSES } from './src/utils/appointmentHelpers';
import { toTimeDate, parseAppointmentDate } from './src/utils/dateTime';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion Failed: ${message}`);
}

function assertIncludes(arr: string[], fragment: string) {
  const found = arr.some((e) => e.toLowerCase().includes(fragment.toLowerCase()));
  if (!found) {
    throw new Error(`Expected errors to include "${fragment}" but got:\n  ${arr.join('\n  ')}`);
  }
}

// ---------------------------------------------------------------------------
// Mock DB builder
// ---------------------------------------------------------------------------

const TODAY = parseAppointmentDate('2026-07-01');
const T0900 = toTimeDate('09:00');
const T1000 = toTimeDate('10:00');
const T1030 = toTimeDate('10:30');
const T1100 = toTimeDate('11:00');

const BUSINESS_ID = 'aabbccdd-0000-0000-0000-000000000001';
const CUSTOMER_ID = 'aabbccdd-0000-0000-0000-000000000002';
const SERVICE_ID  = 'aabbccdd-0000-0000-0000-000000000003';
const STAFF_ID    = 'aabbccdd-0000-0000-0000-000000000004';
const RESOURCE_ID = 'aabbccdd-0000-0000-0000-000000000005';
const APPT_ID     = 'aabbccdd-0000-0000-0000-000000000006';

/** Build a minimal mock DB client whose methods return controllable values */
function buildMockDb(overrides: Record<string, any> = {}): any {
  const get = <T>(key: string, def: T): T =>
    Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : def;

  return {
    business: {
      findUnique: async () => get('business', {
        id: BUSINESS_ID, businessName: 'Acme Gym', ownerId: 'owner-1',
        subscriptionStatus: 'ACTIVE',
      }),
    },
    user: {
      findUnique: async () => get('customer', {
        id: CUSTOMER_ID, role: UserRole.CUSTOMER, name: 'John',
      }),
    },
    service: {
      findFirst: async () => get('service', {
        id: SERVICE_ID, serviceName: 'Yoga', durationMinutes: 60,
      }),
    },
    staff: {
      findFirst: async () => get('staff', {
        id: STAFF_ID, availabilityStatus: AvailabilityStatus.AVAILABLE,
        user: { name: 'Alice' },
      }),
    },
    resource: {
      findFirst: async () => get('resource', {
        id: RESOURCE_ID, resourceName: 'Studio A', status: ResourceStatus.AVAILABLE,
      }),
    },
    appointment: {
      findMany: async () => get('appointments', []),
    },
    // New: staff availability schedule (default: available all day)
    staffAvailability: {
      findFirst: async () => get('staffAvailability', {
        startTime: toTimeDate('00:00'),
        endTime:   toTimeDate('23:59'),
      }),
    },
    // New: staff leave (default: no approved leave)
    staffLeave: {
      findFirst: async () => get('staffLeave', null),
    },
  };
}


function baseCtx(partial: Partial<BookingContext> = {}): BookingContext {
  return {
    customerId: CUSTOMER_ID,
    businessId: BUSINESS_ID,
    serviceId:  SERVICE_ID,
    staffId:    STAFF_ID,
    resourceId: RESOURCE_ID,
    appointmentDate: TODAY,
    startTime: T0900,
    endTime:   T1000,
    ...partial,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

async function runTests() {
  console.log('--- STARTING BOOKING ENGINE UNIT TESTS ---\n');

  // =========================================================================
  // SECTION A: Duration Validator
  // =========================================================================
  console.log('--- A: Duration Validator ---');

  // A1: Exact match
  {
    const err = validateDuration(T0900, T1000, 60);
    assert(err === null, 'A1: exact 60-min duration should pass');
    console.log('✅ A1 Passed: 60-min duration accepted for 60-min service');
  }

  // A2: Mismatch — too short
  {
    const err = validateDuration(T0900, T1000, 90);
    assert(err !== null, 'A2: 60-min slot for 90-min service should fail');
    assert(err!.includes('90 minute'), 'A2: error should mention required 90 min');
    console.log('✅ A2 Passed: Duration mismatch correctly reported');
  }

  // A3: Mismatch — too long
  {
    const err = validateDuration(T0900, T1100, 60);
    assert(err !== null, 'A3: 120-min slot for 60-min service should fail');
    assert(err!.includes('60 minute'), 'A3: error should mention required 60 min');
    console.log('✅ A3 Passed: Oversized slot correctly rejected');
  }

  // =========================================================================
  // SECTION B: Conflict Detectors (standalone)
  // =========================================================================
  console.log('\n--- B: Conflict Detectors ---');

  // B1: Staff — no conflict
  {
    const db = buildMockDb({ appointments: [] });
    const result = await assertNoStaffDoubleBooking(db, {
      businessId: BUSINESS_ID, appointmentDate: TODAY,
      startTime: T0900, endTime: T1000, staffId: STAFF_ID,
    });
    assert(result === null, 'B1: no existing appointments → no conflict');
    console.log('✅ B1 Passed: Staff no-conflict accepted');
  }

  // B2: Staff — overlapping appointment
  {
    const db = buildMockDb({
      appointments: [{ id: APPT_ID, startTime: T0900, endTime: T1000 }],
    });
    const result = await assertNoStaffDoubleBooking(db, {
      businessId: BUSINESS_ID, appointmentDate: TODAY,
      startTime: T0900, endTime: T1000, staffId: STAFF_ID,
    });
    assert(result !== null, 'B2: overlapping → conflict detected');
    assert(result!.toLowerCase().includes('staff conflict'), 'B2: error mentions staff conflict');
    console.log('✅ B2 Passed: Staff double-booking conflict detected');
  }

  // B3: Staff — adjacent (no overlap, end = start of next)
  {
    const db = buildMockDb({
      appointments: [{ id: APPT_ID, startTime: T0900, endTime: T1000 }],
    });
    const result = await assertNoStaffDoubleBooking(db, {
      businessId: BUSINESS_ID, appointmentDate: TODAY,
      startTime: T1000, endTime: T1100, staffId: STAFF_ID,
    });
    assert(result === null, 'B3: adjacent (non-overlapping) slots are allowed');
    console.log('✅ B3 Passed: Adjacent staff slots allowed');
  }

  // B4: Resource — partial overlap
  {
    const db = buildMockDb({
      appointments: [{ id: APPT_ID, startTime: T0900, endTime: T1000 }],
    });
    const result = await assertNoResourceDoubleBooking(db, {
      businessId: BUSINESS_ID, appointmentDate: TODAY,
      startTime: T0900, endTime: T1030, resourceId: RESOURCE_ID,
    });
    assert(result !== null, 'B4: partial overlap → conflict');
    assert(result!.toLowerCase().includes('resource conflict'), 'B4: error mentions resource conflict');
    console.log('✅ B4 Passed: Resource partial overlap detected');
  }

  // B5: Customer — exact duplicate
  {
    const db = buildMockDb({
      appointments: [{ id: APPT_ID, startTime: T0900, endTime: T1000 }],
    });
    const result = await assertNoCustomerDoubleBooking(db, CUSTOMER_ID, BUSINESS_ID, {
      businessId: BUSINESS_ID, appointmentDate: TODAY,
      startTime: T0900, endTime: T1000,
    });
    assert(result !== null, 'B5: exact duplicate → error');
    assert(result!.toLowerCase().includes('duplicate booking'), 'B5: error mentions duplicate booking');
    console.log('✅ B5 Passed: Customer duplicate booking detected');
  }

  // B6: Customer — overlap (but not exact)
  {
    const db = buildMockDb({
      appointments: [{ id: APPT_ID, startTime: T0900, endTime: T1000 }],
    });
    const result = await assertNoCustomerDoubleBooking(db, CUSTOMER_ID, BUSINESS_ID, {
      businessId: BUSINESS_ID, appointmentDate: TODAY,
      startTime: T0900, endTime: T1030,
    });
    assert(result !== null, 'B6: overlapping customer booking → error');
    assert(result!.toLowerCase().includes('schedule conflict'), 'B6: error mentions schedule conflict');
    console.log('✅ B6 Passed: Customer schedule overlap detected');
  }

  // B7: excludeAppointmentId skips self (for updates)
  {
    const db = buildMockDb({
      appointments: [],  // findMany returns nothing because exclude filters it out
    });
    const result = await assertNoStaffDoubleBooking(db, {
      businessId: BUSINESS_ID, appointmentDate: TODAY,
      startTime: T0900, endTime: T1000, staffId: STAFF_ID,
      excludeAppointmentId: APPT_ID,
    });
    assert(result === null, 'B7: self-excluded appointment should not conflict');
    console.log('✅ B7 Passed: excludeAppointmentId correctly skips self');
  }

  // =========================================================================
  // SECTION C: Unified validateAppointmentBooking — Happy Path
  // =========================================================================
  console.log('\n--- C: Unified Validator — Happy Path ---');

  // C1: All validations pass
  {
    const db = buildMockDb();
    const { business, service } = await validateAppointmentBooking(db, baseCtx());
    assert(business.businessName === 'Acme Gym', 'C1: returns business details');
    assert(service.durationMinutes === 60, 'C1: returns service details');
    console.log('✅ C1 Passed: All validations pass on clean booking');
  }

  // =========================================================================
  // SECTION D: Error Aggregation — Multiple Failures
  // =========================================================================
  console.log('\n--- D: Error Aggregation ---');

  // D1: Business not found
  {
    const db = buildMockDb({ business: null });
    try {
      await validateAppointmentBooking(db, baseCtx());
      throw new Error('Should have thrown');
    } catch (err) {
      assert(err instanceof BookingValidationError, 'D1: should throw BookingValidationError');
      assertIncludes((err as BookingValidationError).errors, 'business not found');
      console.log('✅ D1 Passed: Missing business triggers validation error');
    }
  }

  // D2: Customer not found
  {
    const db = buildMockDb({ customer: null });
    try {
      await validateAppointmentBooking(db, baseCtx());
      throw new Error('Should have thrown');
    } catch (err) {
      assert(err instanceof BookingValidationError, 'D2: should throw BookingValidationError');
      assertIncludes((err as BookingValidationError).errors, 'customer account not found');
      console.log('✅ D2 Passed: Missing customer triggers validation error');
    }
  }

  // D3: Service not found
  {
    const db = buildMockDb({ service: null });
    try {
      await validateAppointmentBooking(db, baseCtx());
      throw new Error('Should have thrown');
    } catch (err) {
      assert(err instanceof BookingValidationError, 'D3: should throw BookingValidationError');
      assertIncludes((err as BookingValidationError).errors, 'service not found');
      console.log('✅ D3 Passed: Missing service triggers validation error');
    }
  }

  // D4: Staff not found
  {
    const db = buildMockDb({ staff: null });
    try {
      await validateAppointmentBooking(db, baseCtx());
      throw new Error('Should have thrown');
    } catch (err) {
      assert(err instanceof BookingValidationError, 'D4: should throw BookingValidationError');
      assertIncludes((err as BookingValidationError).errors, 'staff member not found');
      console.log('✅ D4 Passed: Missing staff triggers validation error');
    }
  }

  // D5: Staff unavailable (ON_LEAVE)
  {
    const db = buildMockDb({
      staff: { id: STAFF_ID, availabilityStatus: AvailabilityStatus.ON_LEAVE, user: { name: 'Alice' } },
    });
    try {
      await validateAppointmentBooking(db, baseCtx());
      throw new Error('Should have thrown');
    } catch (err) {
      assert(err instanceof BookingValidationError, 'D5: should throw BookingValidationError');
      assertIncludes((err as BookingValidationError).errors, 'on leave');
      console.log('✅ D5 Passed: Staff on leave triggers validation error');
    }
  }

  // D6: Resource unavailable (MAINTENANCE)
  {
    const db = buildMockDb({
      resource: { id: RESOURCE_ID, resourceName: 'Studio A', status: ResourceStatus.MAINTENANCE },
    });
    try {
      await validateAppointmentBooking(db, baseCtx());
      throw new Error('Should have thrown');
    } catch (err) {
      assert(err instanceof BookingValidationError, 'D6: should throw BookingValidationError');
      assertIncludes((err as BookingValidationError).errors, 'maintenance');
      console.log('✅ D6 Passed: Resource under maintenance triggers validation error');
    }
  }

  // D7: Duration mismatch (60-min slot for 90-min service)
  {
    const db = buildMockDb({
      service: { id: SERVICE_ID, serviceName: 'Long Yoga', durationMinutes: 90 },
    });
    try {
      await validateAppointmentBooking(db, baseCtx());
      throw new Error('Should have thrown');
    } catch (err) {
      assert(err instanceof BookingValidationError, 'D7: should throw BookingValidationError');
      assertIncludes((err as BookingValidationError).errors, 'duration mismatch');
      console.log('✅ D7 Passed: Duration mismatch triggers validation error');
    }
  }

  // D8: Staff conflict (overlapping booking)
  {
    const db = buildMockDb({
      appointments: [{ id: 'other-appt', startTime: T0900, endTime: T1000 }],
    });
    try {
      await validateAppointmentBooking(db, baseCtx({ resourceId: null }));
      throw new Error('Should have thrown');
    } catch (err) {
      assert(err instanceof BookingValidationError, 'D8: should throw BookingValidationError');
      assertIncludes((err as BookingValidationError).errors, 'staff conflict');
      console.log('✅ D8 Passed: Staff scheduling conflict triggers validation error');
    }
  }

  // D9: Multiple simultaneous errors (customer + service missing + staff unavailable)
  {
    const db = buildMockDb({
      customer: null,
      service: null,
      staff: { id: STAFF_ID, availabilityStatus: AvailabilityStatus.BUSY, user: { name: 'Alice' } },
    });
    try {
      await validateAppointmentBooking(db, baseCtx());
      throw new Error('Should have thrown');
    } catch (err) {
      assert(err instanceof BookingValidationError, 'D9: should throw BookingValidationError');
      const errors = (err as BookingValidationError).errors;
      assert(errors.length >= 3, `D9: expected ≥3 errors, got ${errors.length}`);
      assertIncludes(errors, 'customer account not found');
      assertIncludes(errors, 'service not found');
      assertIncludes(errors, 'busy');
      console.log(`✅ D9 Passed: ${errors.length} simultaneous errors aggregated correctly`);
    }
  }

  // D10: Business subscription suspended
  {
    const db = buildMockDb({
      business: { id: BUSINESS_ID, businessName: 'Acme Gym', ownerId: 'owner-1', subscriptionStatus: 'SUSPENDED' },
    });
    try {
      await validateAppointmentBooking(db, baseCtx());
      throw new Error('Should have thrown');
    } catch (err) {
      assert(err instanceof BookingValidationError, 'D10: should throw BookingValidationError');
      assertIncludes((err as BookingValidationError).errors, 'not accepting new appointments');
      console.log('✅ D10 Passed: Suspended business subscription blocks booking');
    }
  }

  console.log('\n🎉 ALL BOOKING ENGINE TESTS PASSED SUCCESSFULLY! 🎉');
}

runTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err.message ?? err);
  process.exit(1);
});
