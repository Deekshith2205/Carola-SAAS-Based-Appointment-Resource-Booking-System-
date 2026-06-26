import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarPlus, CalendarCheck, Clock, CheckCircle2,
  ChevronRight, ArrowUpRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useAppointments } from '../../hooks/queries/useAppointments';
import { formatTime, formatDate, formatCurrency } from '../../utils';
import type { Appointment, AppointmentStatus } from '../../types';
import { SkeletonCard } from '../../components/common';

const STATUS_BADGE: Record<AppointmentStatus, string> = {
  CONFIRMED:   'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  COMPLETED:   'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  CANCELLED:   'bg-rose-50 text-rose-600 ring-1 ring-rose-200',
  PENDING:     'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  NO_SHOW:     'bg-gray-50 text-gray-600 ring-1 ring-gray-200',
  RESCHEDULED: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon, iconCls
}: {
  label: string; value: string | number;
  icon: React.ReactNode; iconCls: string;
}) {
  return (
    <Card className="hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', iconCls)}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

// ─── Page Header ──────────────────────────────────────────────────────────────
function PageHeader({ name }: { name: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {name} 👋</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your bookings and appointments from one place.</p>
      </div>
      <Link to="/portal/book">
        <Button className="gap-2 shrink-0">
          <CalendarPlus className="h-4 w-4" /> Book Appointment
        </Button>
      </Link>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CustomerDashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  const { data: apptData, isLoading } = useAppointments();
  const appointments = apptData?.appointments ?? [];

  const { upcoming, recent, stats } = useMemo(() => {
    const now = new Date();
    const up: Appointment[] = [];
    const rec: Appointment[] = [];

    let pendingCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;

    for (const appt of appointments) {
      if (appt.status === 'PENDING' || appt.status === 'CONFIRMED' || appt.status === 'RESCHEDULED') {
        const apptDate = new Date(`${appt.appointmentDate.split('T')[0]}T${appt.startTime}`);
        if (apptDate >= now) {
          up.push(appt);
        } else {
          rec.push(appt);
        }
        if (appt.status === 'PENDING') pendingCount++;
      } else {
        rec.push(appt);
        if (appt.status === 'COMPLETED') completedCount++;
        if (appt.status === 'CANCELLED') cancelledCount++;
      }
    }

    return {
      upcoming: up.slice(0, 3),
      recent: rec.slice(0, 5),
      stats: {
        total: appointments.length,
        upcoming: up.length,
        completed: completedCount,
        cancelled: cancelledCount,
      }
    };
  }, [appointments]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-16 w-64 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} rows={2} />)}
        </div>
        <SkeletonCard rows={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader name={firstName} />

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Bookings"
          value={stats.total}
          icon={<CalendarCheck className="h-4 w-4 text-primary" />}
          iconCls="bg-primary/10 text-primary"
        />
        <StatCard
          label="Upcoming"
          value={stats.upcoming}
          icon={<Clock className="h-4 w-4 text-violet-600" />}
          iconCls="bg-violet-50 text-violet-600"
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          iconCls="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Cancelled"
          value={stats.cancelled}
          icon={<CalendarCheck className="h-4 w-4 text-rose-600" />}
          iconCls="bg-rose-50 text-rose-600"
        />
      </div>

      {/* ── Upcoming Appointments ── */}
      {upcoming.length > 0 && (
        <Card>
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Upcoming Appointments</CardTitle>
              <Link to="/portal/appointments" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                View all <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y">
            {upcoming.map(appt => {
              const day = new Date(appt.appointmentDate).getDate();
              const month = new Date(appt.appointmentDate).toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
              return (
                <div key={appt.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl border bg-muted flex flex-col items-center justify-center shrink-0 text-foreground font-bold text-xs">
                      <span className="text-base leading-none">{day}</span>
                      <span className="text-[9px] text-muted-foreground leading-none mt-0.5">{month}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{appt.service?.serviceName ?? 'Service'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {appt.business?.businessName ?? 'Business'} · <Clock className="inline h-3 w-3" /> {formatTime(appt.startTime)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_BADGE[appt.status] || STATUS_BADGE.PENDING)}>
                      {appt.status}
                    </span>
                    <span className="text-sm font-semibold text-foreground">{formatCurrency(appt.service?.price ?? 0)}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ── Recent Appointments ── */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Appointments</CardTitle>
            <Link to="/portal/appointments" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </CardHeader>

        {recent.length === 0 ? (
          <CardContent className="py-16 flex flex-col items-center text-center gap-3">
            <div className="h-12 w-12 rounded-xl border bg-muted flex items-center justify-center">
              <CalendarCheck className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">No appointments yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">Book your first appointment to get started.</p>
            </div>
            <Link to="/portal/book">
              <Button variant="outline" size="sm" className="mt-1 gap-2">
                <CalendarPlus className="h-3.5 w-3.5" /> Book Now
              </Button>
            </Link>
          </CardContent>
        ) : (
          <CardContent className="p-0 divide-y">
            {recent.map(appt => (
              <div key={appt.id} className="flex items-center justify-between gap-4 px-6 py-3.5 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{appt.service?.serviceName ?? 'Service'}</p>
                    <p className="text-xs text-muted-foreground">{appt.business?.businessName ?? 'Business'} · {formatDate(appt.appointmentDate)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold">{formatCurrency(appt.service?.price ?? 0)}</span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium hidden sm:inline-block', STATUS_BADGE[appt.status] || STATUS_BADGE.PENDING)}>
                    {appt.status}
                  </span>
                  {appt.status === 'COMPLETED' && (
                    <Button variant="ghost" size="sm" className="gap-1 text-primary text-xs h-7 hidden sm:flex">
                      <ArrowUpRight className="h-3.5 w-3.5" /> Rebook
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
