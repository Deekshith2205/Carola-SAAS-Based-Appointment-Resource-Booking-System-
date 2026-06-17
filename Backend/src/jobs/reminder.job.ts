import cron from 'node-cron';
import { prisma } from '../prisma/client';
import { dispatchAppointmentEvent } from '../services/notificationDispatcher';
import { NotificationType } from '@prisma/client';

export function initJobs() {
  // Run every hour to check for appointments happening in exactly 24 hours
  // In a real production system, you might run this more frequently (e.g. every 15 mins) 
  // and check a range, keeping track of what has been reminded to avoid duplicates.
  
  cron.schedule('0 * * * *', async () => {
    console.log('Running Appointment Reminder Job...');
    
    try {
      const now = new Date();
      // Look 24 hours into the future
      const targetStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const targetEnd = new Date(targetStart.getTime() + 60 * 60 * 1000); // 1 hour window

      const targetDateStr = targetStart.toISOString().slice(0, 10);
      // Construct time string 'HH:MM:00' to query `db.Time(0)`
      // This is simplified. Normally we query a combination of appointmentDate and startTime.
      // Since startTime is stored as 1970-01-01T... we extract UTC hours/mins.

      const startH = targetStart.getUTCHours().toString().padStart(2, '0');
      const startM = targetStart.getUTCMinutes().toString().padStart(2, '0');
      const timeStrGte = `1970-01-01T${startH}:${startM}:00.000Z`;

      const endH = targetEnd.getUTCHours().toString().padStart(2, '0');
      const endM = targetEnd.getUTCMinutes().toString().padStart(2, '0');
      const timeStrLt = `1970-01-01T${endH}:${endM}:00.000Z`;

      const upcomingAppointments = await prisma.appointment.findMany({
        where: {
          appointmentDate: new Date(targetDateStr),
          startTime: {
            gte: new Date(timeStrGte),
            lt: new Date(timeStrLt),
          },
          status: 'CONFIRMED',
          // Ensure we haven't already sent a reminder
          NOT: {
            // Need to join Notifications, Prisma supports relation queries
            // Since there's no reverse relation mapped to Appointment for Notifications easily 
            // without referenceId being properly relation-mapped, we will do a separate query 
            // or fetch all then filter. For now, fetch and filter.
          }
        },
        select: { id: true },
      });

      for (const appt of upcomingAppointments) {
        // Check if reminder was already sent
        const existing = await prisma.notification.findFirst({
          where: {
            referenceId: appt.id,
            type: NotificationType.APPOINTMENT_REMINDER,
          },
        });

        if (!existing) {
          await dispatchAppointmentEvent(appt.id, NotificationType.APPOINTMENT_REMINDER);
          console.log(`Sent reminder for appointment: ${appt.id}`);
        }
      }
    } catch (err) {
      console.error('Error in reminder job:', err);
    }
  });

  console.log('Cron jobs initialized.');
}
