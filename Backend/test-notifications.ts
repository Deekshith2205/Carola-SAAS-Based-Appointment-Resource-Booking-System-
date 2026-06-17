import { AppointmentStatus, NotificationType } from '@prisma/client';
import { prisma } from './src/prisma/client';
import nodemailer from 'nodemailer';

const APPT_ID = 'aabbccdd-0000-0000-0000-000000000001';

// Mocks
let sentEmails: any[] = [];

(nodemailer as any).createTransport = () => ({
  sendMail: async (opts: any) => {
    sentEmails.push(opts);
    return { messageId: 'mock-id' };
  }
});

const originalFindUnique = prisma.appointment.findUnique;
(prisma.appointment as any).findUnique = async () => ({
  id: APPT_ID,
  appointmentDate: new Date('2026-06-20T00:00:00Z'),
  startTime: new Date('1970-01-01T10:00:00Z'),
  customer: { id: 'cust-1', email: 'cust@example.com', name: 'John' },
  service: { serviceName: 'Yoga Class' },
  staff: { user: { name: 'Alice Staff' } },
});

const originalCreateNotif = prisma.notification.create;
let createdNotifications: any[] = [];
(prisma.notification as any).create = async (args: any) => {
  createdNotifications.push(args.data);
  return { id: 'notif-1' };
};

async function runTests() {
  const { dispatchAppointmentEvent } = await import('./src/services/notificationDispatcher');
  
  console.log('--- STARTING NOTIFICATIONS UNIT TESTS ---\n');

  // Test 1: Created Event
  {
    sentEmails = [];
    createdNotifications = [];
    await dispatchAppointmentEvent(APPT_ID, NotificationType.APPOINTMENT_CREATED);
    
    // Check DB
    if (createdNotifications.length !== 1 || createdNotifications[0].type !== 'APPOINTMENT_CREATED') {
      throw new Error('Failed to create DB notification for APPOINTMENT_CREATED');
    }
    
    // Check Email (needs a tiny delay since we didn't await it in dispatcher)
    await new Promise((r) => setTimeout(r, 50));
    if (sentEmails.length !== 1 || !sentEmails[0].html.includes('PENDING')) {
      throw new Error('Failed to send email for APPOINTMENT_CREATED');
    }
    console.log('✅ Appointment Created Dispatch Passed');
  }

  // Test 2: Confirmed Event
  {
    sentEmails = [];
    createdNotifications = [];
    await dispatchAppointmentEvent(APPT_ID, NotificationType.APPOINTMENT_CONFIRMED);
    
    if (createdNotifications[0].type !== 'APPOINTMENT_CONFIRMED') throw new Error('DB error');
    await new Promise((r) => setTimeout(r, 50));
    if (!sentEmails[0].html.includes('confirmed')) throw new Error('Email error');
    console.log('✅ Appointment Confirmed Dispatch Passed');
  }

  // Test 3: Cancelled Event
  {
    sentEmails = [];
    createdNotifications = [];
    await dispatchAppointmentEvent(APPT_ID, NotificationType.APPOINTMENT_CANCELLED);
    
    if (createdNotifications[0].type !== 'APPOINTMENT_CANCELLED') throw new Error('DB error');
    await new Promise((r) => setTimeout(r, 50));
    if (!sentEmails[0].html.includes('cancelled')) throw new Error('Email error');
    console.log('✅ Appointment Cancelled Dispatch Passed');
  }

  // Test 4: Reminder Event
  {
    sentEmails = [];
    createdNotifications = [];
    await dispatchAppointmentEvent(APPT_ID, NotificationType.APPOINTMENT_REMINDER);
    
    if (createdNotifications[0].type !== 'APPOINTMENT_REMINDER') throw new Error('DB error');
    await new Promise((r) => setTimeout(r, 50));
    if (!sentEmails[0].html.includes('reminder')) throw new Error('Email error');
    console.log('✅ Appointment Reminder Dispatch Passed');
  }

  console.log('\n🎉 ALL NOTIFICATIONS TESTS PASSED! 🎉');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(() => {
  // Restore
  prisma.appointment.findUnique = originalFindUnique;
  prisma.notification.create = originalCreateNotif;
});
