import React from 'react';
import { useAuth } from '../context/AuthContext';
import { usePlatformStatistics } from '../hooks/useBusinesses';
import { useAppointments } from '../hooks/useAppointments';
import { StatCard, LoadingSpinner, ErrorMessage } from '../components/common';
import { getErrorMessage } from '../utils';

export default function Dashboard() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Super admin sees platform-wide stats, others see their appointments
  const statsQuery = usePlatformStatistics();
  const appointmentsQuery = useAppointments({ limit: 5 });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          Welcome back, <span className="font-semibold">{user?.name}</span>
        </p>
      </div>

      {/* Stats */}
      {isSuperAdmin && (
        <>
          {statsQuery.isLoading && <LoadingSpinner />}
          {statsQuery.error && <ErrorMessage message={getErrorMessage(statsQuery.error)} />}
          {statsQuery.data && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Users"
                value={statsQuery.data.totalUsers.toLocaleString()}
                subtitle="Registered on platform"
              />
              <StatCard
                title="Total Businesses"
                value={statsQuery.data.totalBusinesses.toLocaleString()}
                subtitle="Active tenants"
              />
              <StatCard
                title="Total Resources"
                value={statsQuery.data.totalResources.toLocaleString()}
                subtitle="Across all businesses"
              />
              <StatCard
                title="Total Appointments"
                value={statsQuery.data.totalAppointments.toLocaleString()}
                subtitle="All-time bookings"
              />
            </div>
          )}
        </>
      )}

      {/* Recent Appointments */}
      <div className="rounded-xl border bg-card shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Recent Appointments</h3>
        </div>
        <div className="p-6">
          {appointmentsQuery.isLoading && <LoadingSpinner />}
          {appointmentsQuery.error && (
            <ErrorMessage message={getErrorMessage(appointmentsQuery.error)} />
          )}
          {appointmentsQuery.data && (
            <p className="text-sm text-muted-foreground">
              {appointmentsQuery.data.data.pagination
                ? `${(appointmentsQuery.data.data.pagination as any).total} appointments found.`
                : 'Data loaded successfully.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
