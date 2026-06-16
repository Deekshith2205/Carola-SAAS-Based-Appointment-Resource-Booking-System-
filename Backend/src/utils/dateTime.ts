export function toTimeDate(time: string): Date {
  const normalized = time.length === 5 ? `${time}:00` : time;
  return new Date(`1970-01-01T${normalized}.000Z`);
}

export function parseAppointmentDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function formatTimeLabel(time: Date): string {
  const hours = time.getUTCHours().toString().padStart(2, '0');
  const minutes = time.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatDateLabel(date: Date): string {
  return date.toISOString().slice(0, 10);
}
