// Global type definitions shared across the frontend

export type UserRole = 'SUPER_ADMIN' | 'BUSINESS_OWNER' | 'STAFF' | 'CUSTOMER';

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' | 'SUSPENDED';

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW' | 'RESCHEDULED';

export type ResourceType = 'ROOM' | 'EQUIPMENT' | 'VEHICLE' | 'OTHER';

export type ResourceStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'UNAVAILABLE';

export type AvailabilityStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'BUSY' | 'ON_LEAVE' | 'OFF_DUTY';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: User;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

// ---------------------------------------------------------------------------
// Business
// ---------------------------------------------------------------------------
export interface Business {
  id: string;
  ownerId: string;
  businessName: string;
  businessType: string;
  phone?: string;
  email?: string;
  address?: string;
  subscriptionStatus: SubscriptionStatus;
  createdAt: string;
  owner?: Pick<User, 'id' | 'name' | 'email'>;
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------
export interface Staff {
  id: string;
  businessId: string;
  userId: string;
  designation?: string;
  department?: string;
  yearsOfExperience?: number;
  bio?: string;
  certifications?: string[];
  specializations?: string[];
  availabilityStatus: AvailabilityStatus;
  createdAt: string;
  user?: Pick<User, 'id' | 'name' | 'email' | 'role' | 'phone'>;
  services?: Pick<Service, 'id' | 'serviceName'>[];
  availability?: StaffAvailability[];
}

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export interface StaffBreak {
  id: string;
  availabilityId: string;
  name: string;
  startTime: string;
  endTime: string;
}

export interface StaffAvailability {
  id: string;
  staffId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isActive: boolean;
  breaks?: StaffBreak[];
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------
export interface Service {
  id: string;
  businessId: string;
  serviceName: string;
  durationMinutes: number;
  price: number;
  description?: string;
  defaultResourceId?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------
export interface Resource {
  id: string;
  businessId: string;
  resourceName: string;
  resourceType: ResourceType;
  status: ResourceStatus;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Appointment
// ---------------------------------------------------------------------------
export interface Appointment {
  id: string;
  customerId: string;
  businessId: string;
  serviceId: string;
  staffId?: string;
  resourceId?: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  createdAt: string;
  customer?: Pick<User, 'id' | 'name' | 'email'>;
  business?: Pick<Business, 'id' | 'businessName' | 'ownerId'>;
  service?: Service;
  staff?: Staff;
  resource?: Resource;
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    [key: string]: T[] | PaginationMeta;
    pagination: PaginationMeta;
  };
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
export interface ApiSuccessResponse<T> {
  success: true;
  message?: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}
