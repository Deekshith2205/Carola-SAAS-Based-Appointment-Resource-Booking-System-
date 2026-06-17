import { NotificationType } from '@prisma/client';
import { prisma } from '../prisma/client';
import * as emailService from './email.service';
import { formatDateLabel, formatTimeLabel } from '../utils/dateTime';

export async function dispatchAppointmentEvent(
  appointmentId: string,
  type: NotificationType
) {
  // 1. Fetch full appointment details including related user and service
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      customer: true,
      service: true,
      staff: {
        include: { user: true },
      },
    },
  });

  if (!appointment) return;

  const { customer, service, staff } = appointment;
  const dateStr = formatDateLabel(appointment.appointmentDate);
  const timeStr = formatTimeLabel(appointment.startTime);
  const staffName = staff?.user?.name;

  const details = {
    serviceName: service.serviceName,
    date: dateStr,
    time: timeStr,
    staffName,
  };

  let title = '';
  let message = '';

  switch (type) {
    case NotificationType.APPOINTMENT_CREATED:
      title = 'Appointment Created';
      message = `Your appointment for ${service.serviceName} on ${dateStr} at ${timeStr} has been successfully created.`;
      break;
    case NotificationType.APPOINTMENT_CONFIRMED:
      title = 'Appointment Confirmed';
      message = `Your appointment for ${service.serviceName} on ${dateStr} at ${timeStr} is confirmed.`;
      break;
    case NotificationType.APPOINTMENT_CANCELLED:
      title = 'Appointment Cancelled';
      message = `Your appointment for ${service.serviceName} on ${dateStr} at ${timeStr} has been cancelled.`;
      break;
    case NotificationType.APPOINTMENT_REMINDER:
      title = 'Appointment Reminder';
      message = `Reminder: You have an appointment for ${service.serviceName} on ${dateStr} at ${timeStr}.`;
      break;
    default:
      title = 'System Notification';
      message = `Update on your appointment for ${service.serviceName}.`;
  }

  // 2. Create in-app notification
  await prisma.notification.create({
    data: {
      userId: customer.id,
      title,
      message,
      type,
      referenceId: appointment.id,
    },
  });

  // 3. Send email asynchronously
  // We do not await this to avoid blocking the API response.
  // In production, this should ideally be pushed to a queue (e.g., BullMQ).
  (async () => {
    try {
      switch (type) {
        case NotificationType.APPOINTMENT_CREATED:
          await emailService.sendAppointmentCreatedEmail(customer.email, details);
          break;
        case NotificationType.APPOINTMENT_CONFIRMED:
          await emailService.sendAppointmentConfirmedEmail(customer.email, details);
          break;
        case NotificationType.APPOINTMENT_CANCELLED:
          await emailService.sendAppointmentCancelledEmail(customer.email, details);
          break;
        case NotificationType.APPOINTMENT_REMINDER:
          await emailService.sendAppointmentReminderEmail(customer.email, details);
          break;
      }
    } catch (err) {
      console.error(`Failed to send email for appointment ${appointmentId}:`, err);
    }
  })();
}
