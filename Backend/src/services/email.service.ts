import nodemailer from 'nodemailer';

// For simplicity, we create a generic transporter. 
// In production, this uses actual SMTP variables. If not provided,
// it could fall back to a mock service or ethereal, but here we expect env vars.
// The env configuration was not fully inspected, but we'll use process.env directly
// for SMTP settings.

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"SaaS Appointments" <noreply@example.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    console.log(`Email sent: ${info.messageId}`);
    // If using ethereal email for testing, log the URL:
    if (process.env.SMTP_HOST === 'smtp.ethereal.email') {
      console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
  } catch (error) {
    console.error('Failed to send email:', error);
    // In production, we might not want to throw or we might retry, but let's log it.
  }
}

export async function sendAppointmentCreatedEmail(to: string, details: any) {
  const html = `
    <h2>Appointment Created</h2>
    <p>Your appointment for <strong>${details.serviceName}</strong> has been created successfully.</p>
    <ul>
      <li>Date: ${details.date}</li>
      <li>Time: ${details.time}</li>
      <li>Staff: ${details.staffName || 'Any'}</li>
    </ul>
    <p>Status: PENDING</p>
  `;
  await sendEmail({ to, subject: 'Appointment Created', html });
}

export async function sendAppointmentConfirmedEmail(to: string, details: any) {
  const html = `
    <h2>Appointment Confirmed</h2>
    <p>Your appointment for <strong>${details.serviceName}</strong> has been confirmed.</p>
    <ul>
      <li>Date: ${details.date}</li>
      <li>Time: ${details.time}</li>
      <li>Staff: ${details.staffName || 'Any'}</li>
    </ul>
  `;
  await sendEmail({ to, subject: 'Appointment Confirmed', html });
}

export async function sendAppointmentCancelledEmail(to: string, details: any) {
  const html = `
    <h2>Appointment Cancelled</h2>
    <p>We're sorry, but your appointment for <strong>${details.serviceName}</strong> on ${details.date} at ${details.time} has been cancelled.</p>
  `;
  await sendEmail({ to, subject: 'Appointment Cancelled', html });
}

export async function sendAppointmentReminderEmail(to: string, details: any) {
  const html = `
    <h2>Appointment Reminder</h2>
    <p>This is a reminder for your upcoming appointment for <strong>${details.serviceName}</strong>.</p>
    <ul>
      <li>Date: ${details.date}</li>
      <li>Time: ${details.time}</li>
      <li>Staff: ${details.staffName || 'Any'}</li>
    </ul>
  `;
  await sendEmail({ to, subject: 'Appointment Reminder', html });
}
