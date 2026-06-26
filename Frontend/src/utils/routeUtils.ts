import { UserRole } from '../types';

export function getDefaultRouteForRole(role?: UserRole): string {
  if (!role) return '/login';
  
  switch (role) {
    case 'CUSTOMER':
      return '/portal/dashboard';
    case 'BUSINESS_OWNER':
    case 'STAFF':
    case 'SUPER_ADMIN':
      return '/dashboard';
    default:
      return '/login';
  }
}
