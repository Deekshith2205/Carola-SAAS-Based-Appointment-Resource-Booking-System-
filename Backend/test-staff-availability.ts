import { DayOfWeek, LeaveStatus } from '@prisma/client';
import {
  dateToDayOfWeek,
  isStaffAvailableAtSlot,
} from './src/services/staffAvailability.service';
import { toTimeDate, parseAppointmentDate } from './src/utils/dateTime';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion Failed: ${message}`);
}

function assertIncludes(val: string | null, fragment: string, label: string) {
  if (!val || !val.toLowerCase().includes(fragment.toLowerCase())) {
    throw new Error(`${label}: expected "${fragment}" in "${val}"`);
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STAFF_ID = 'aabbccdd-0000-0000-0000-000000000001';

// MON = 2026-06-15 (UTC Monday)
const MON_DATE = parseAppointmentDate('2026-06-16'); // UTC Monday check
const SUN_DATE = parseAppointmentDate('2026-06-14'); // UTC Sunday

const T0900 = toTimeDate('09:00');
const T1000 = toTimeDate('10:00');
const T1100 = toTimeDate('11:00');
const T1800 = toTimeDate('18:00');
const T0700 = toTimeDate('07:00');
const T1900 = toTimeDate('19:00');

// ---------------------------------------------------------------------------
// Mock DB builder
// ---------------------------------------------------------------------------

interface MockDbOptions {
  availability?: any | null;  // null = no schedule found
  leave?: any | null;         // null = no approved leave
}

function buildMockDb({ availability, leave }: MockDbOptions = {}): any {
  return {
    staffAvailability: {
      findFirst: async () => {
        if (availability === null) return null;
        return availability ?? {
          startTime: T0900,
          endTime:   T1800,
        };
      },
    },
    staffLeave: {
      findFirst: async () => {
        if (leave === null) return null;
        return leave ?? null;
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

async function runTests() {
  console.log('--- STARTING STAFF AVAILABILITY TESTS ---\n');

  // =========================================================================
  // SECTION A: dateToDayOfWeek helper
  // =========================================================================
  console.log('--- A: dateToDayOfWeek ---');

  {
    // 2026-06-15 is a Monday in UTC
    const monday = new Date('2026-06-15T00:00:00Z');
    assert(dateToDayOfWeek(monday) === DayOfWeek.MON, 'A1: 2026-06-15 should be MON');
    console.log('✅ A1 Passed: Monday correctly identified');
  }

  {
    // 2026-06-21 is a Sunday
    const sunday = new Date('2026-06-21T00:00:00Z');
    assert(dateToDayOfWeek(sunday) === DayOfWeek.SUN, 'A2: 2026-06-21 should be SUN');
    console.log('✅ A2 Passed: Sunday correctly identified');
  }

  {
    const sat = new Date('2026-06-20T00:00:00Z');
    assert(dateToDayOfWeek(sat) === DayOfWeek.SAT, 'A3: 2026-06-20 should be SAT');
    console.log('✅ A3 Passed: Saturday correctly identified');
  }

  // =========================================================================
  // SECTION B: isStaffAvailableAtSlot — Working Hours
  // =========================================================================
  console.log('\n--- B: isStaffAvailableAtSlot — Working Hours ---');

  // B1: Slot perfectly inside working window
  {
    const db = buildMockDb({ availability: { startTime: T0900, endTime: T1800 }, leave: null });
    const result = await isStaffAvailableAtSlot(db, STAFF_ID, MON_DATE, T1000, T1100);
    assert(result === null, 'B1: slot inside working window should pass');
    console.log('✅ B1 Passed: Slot inside working hours accepted');
  }

  // B2: No schedule configured for that day
  {
    const db = buildMockDb({ availability: null, leave: null });
    const result = await isStaffAvailableAtSlot(db, STAFF_ID, MON_DATE, T1000, T1100);
    assert(result !== null, 'B2: no schedule → error');
    assertIncludes(result, 'does not have working hours', 'B2');
    console.log('✅ B2 Passed: Missing schedule correctly rejected');
  }

  // B3: Slot starts before working hours
  {
    const db = buildMockDb({ availability: { startTime: T0900, endTime: T1800 }, leave: null });
    const result = await isStaffAvailableAtSlot(db, STAFF_ID, MON_DATE, T0700, T1000);
    assert(result !== null, 'B3: slot starts before work start → error');
    assertIncludes(result, 'outside staff working hours', 'B3');
    console.log('✅ B3 Passed: Slot before working hours rejected');
  }

  // B4: Slot ends after working hours
  {
    const db = buildMockDb({ availability: { startTime: T0900, endTime: T1800 }, leave: null });
    const result = await isStaffAvailableAtSlot(db, STAFF_ID, MON_DATE, T1000, T1900);
    assert(result !== null, 'B4: slot ends after work end → error');
    assertIncludes(result, 'outside staff working hours', 'B4');
    console.log('✅ B4 Passed: Slot extending past working hours rejected');
  }

  // B5: Slot exactly matches working hours boundary
  {
    const db = buildMockDb({ availability: { startTime: T0900, endTime: T1800 }, leave: null });
    const result = await isStaffAvailableAtSlot(db, STAFF_ID, MON_DATE, T0900, T1800);
    assert(result === null, 'B5: slot exactly matching boundaries should pass');
    console.log('✅ B5 Passed: Slot matching exact working hours accepted');
  }

  // =========================================================================
  // SECTION C: isStaffAvailableAtSlot — Leave Checks
  // =========================================================================
  console.log('\n--- C: isStaffAvailableAtSlot — Leave Checks ---');

  // C1: No approved leave on booking date
  {
    const db = buildMockDb({ availability: { startTime: T0900, endTime: T1800 }, leave: null });
    const result = await isStaffAvailableAtSlot(db, STAFF_ID, MON_DATE, T1000, T1100);
    assert(result === null, 'C1: no leave → should pass');
    console.log('✅ C1 Passed: No leave record allows booking');
  }

  // C2: Staff has approved leave on booking date
  {
    const db = buildMockDb({
      availability: { startTime: T0900, endTime: T1800 },
      leave: { id: 'leave-1', status: LeaveStatus.APPROVED },
    });
    const result = await isStaffAvailableAtSlot(db, STAFF_ID, MON_DATE, T1000, T1100);
    assert(result !== null, 'C2: approved leave → error');
    assertIncludes(result, 'approved leave', 'C2');
    console.log('✅ C2 Passed: Approved leave correctly blocks booking');
  }

  // C3: Staff has PENDING leave — should still allow booking
  {
    // Our service only queries for APPROVED status, so pending leave won't block
    // Mock returns null for pending leave (simulates Prisma filtering by status: APPROVED)
    const db = buildMockDb({
      availability: { startTime: T0900, endTime: T1800 },
      leave: null, // null = no APPROVED leave found
    });
    const result = await isStaffAvailableAtSlot(db, STAFF_ID, MON_DATE, T1000, T1100);
    assert(result === null, 'C3: pending leave should not block booking');
    console.log('✅ C3 Passed: Pending leave does not block booking');
  }

  // =========================================================================
  // SECTION D: Combined working hours + leave
  // =========================================================================
  console.log('\n--- D: Combined Checks ---');

  // D1: Both outside hours AND on approved leave → first error is about hours
  {
    const db = buildMockDb({
      availability: { startTime: T0900, endTime: T1800 },
      leave: { id: 'leave-2', status: LeaveStatus.APPROVED },
    });
    // Check outside-hours first: hours check returns early since slot is outside
    const resultHours = await isStaffAvailableAtSlot(db, STAFF_ID, MON_DATE, T0700, T1000);
    assert(resultHours !== null, 'D1: outside hours → error even with leave present');
    assertIncludes(resultHours, 'outside staff working hours', 'D1');
    console.log('✅ D1 Passed: Hours check takes priority over leave check');
  }

  // D2: Inside hours + no leave = clean pass
  {
    const db = buildMockDb({
      availability: { startTime: T0900, endTime: T1800 },
      leave: null,
    });
    const result = await isStaffAvailableAtSlot(db, STAFF_ID, MON_DATE, T1000, T1100);
    assert(result === null, 'D2: both checks pass');
    console.log('✅ D2 Passed: All availability checks pass for valid slot');
  }

  console.log('\n🎉 ALL STAFF AVAILABILITY TESTS PASSED! 🎉');
}

runTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err.message ?? err);
  process.exit(1);
});
