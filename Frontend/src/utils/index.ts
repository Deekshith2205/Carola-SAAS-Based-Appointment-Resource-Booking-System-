import type { AppointmentStatus, SubscriptionStatus, ResourceStatus, AvailabilityStatus } from '../types';

// ---------------------------------------------------------------------------
// Date & Time
// ---------------------------------------------------------------------------
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(timeStr: string): string {
  // timeStr may be a time-only format like "09:00:00" or a full ISO
  const date = new Date(`1970-01-01T${timeStr}`);
  if (isNaN(date.getTime())) return timeStr;
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  return Math.floor(seconds) + ' seconds ago';
}

// ---------------------------------------------------------------------------
// Status Badge Helpers
// ---------------------------------------------------------------------------
export const appointmentStatusConfig: Record<AppointmentStatus, { label: string; color: string }> = {
  PENDING:     { label: 'Pending',     color: 'bg-yellow-100 text-yellow-800' },
  CONFIRMED:   { label: 'Confirmed',   color: 'bg-green-100 text-green-800' },
  CANCELLED:   { label: 'Cancelled',   color: 'bg-red-100 text-red-800' },
  COMPLETED:   { label: 'Completed',   color: 'bg-blue-100 text-blue-800' },
  NO_SHOW:     { label: 'No Show',     color: 'bg-gray-100 text-gray-800' },
  RESCHEDULED: { label: 'Rescheduled', color: 'bg-purple-100 text-purple-800' },
};

export const subscriptionStatusConfig: Record<SubscriptionStatus, { label: string; color: string }> = {
  TRIAL:    { label: 'Trial',    color: 'bg-blue-100 text-blue-800' },
  ACTIVE:   { label: 'Active',   color: 'bg-green-100 text-green-800' },
  PAST_DUE: { label: 'Past Due', color: 'bg-orange-100 text-orange-800' },
  CANCELLED:{ label: 'Cancelled',color: 'bg-red-100 text-red-800' },
  EXPIRED:  { label: 'Expired',  color: 'bg-gray-100 text-gray-800' },
  SUSPENDED:{ label: 'Suspended',color: 'bg-red-200 text-red-900' },
};

export const resourceStatusConfig: Record<ResourceStatus, { label: string; color: string }> = {
  AVAILABLE:   { label: 'Available',   color: 'bg-green-100 text-green-800' },
  IN_USE:      { label: 'In Use',      color: 'bg-yellow-100 text-yellow-800' },
  MAINTENANCE: { label: 'Maintenance', color: 'bg-orange-100 text-orange-800' },
  UNAVAILABLE: { label: 'Unavailable', color: 'bg-red-100 text-red-800' },
};

export const availabilityStatusConfig: Record<AvailabilityStatus, { label: string; color: string }> = {
  AVAILABLE:   { label: 'Available',   color: 'bg-green-100 text-green-800' },
  UNAVAILABLE: { label: 'Unavailable', color: 'bg-red-100 text-red-800' },
  BUSY:        { label: 'Busy',        color: 'bg-yellow-100 text-yellow-800' },
  ON_LEAVE:    { label: 'On Leave',    color: 'bg-purple-100 text-purple-800' },
};

// ---------------------------------------------------------------------------
// Currency
// ---------------------------------------------------------------------------
export function formatCurrency(amount: string | number, currency = 'INR'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(num);
}

// ---------------------------------------------------------------------------
// Truncate text
// ---------------------------------------------------------------------------
export function truncate(str: string, maxLength: number): string {
  return str.length > maxLength ? `${str.slice(0, maxLength)}…` : str;
}

// ---------------------------------------------------------------------------
// Error message extraction from Axios errors
// ---------------------------------------------------------------------------
export function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: { message?: string } } };
    return axiosError.response?.data?.message ?? 'An unexpected error occurred.';
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}
