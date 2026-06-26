import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from 'recharts';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '../components/ui/card';
import { useAuth } from '../context/AuthContext';
import { appointmentStatusConfig, formatDate, formatTime, formatCurrency } from '../utils';
import { SkeletonCard, SkeletonTable, SkeletonStatCards, ApiErrorBanner, EmptyState } from '../components/common';
import { useMyBusiness } from '../hooks/queries/useBusiness';
import {
  useDashboardSummary,
  useRevenueTrends,
  usePopularServices,
  useStatusDistribution,
} from '../hooks/queries/useDashboard';
import { useAppointments } from '../hooks/queries/useAppointments';
import type { AppointmentStatus } from '../types';

// ─── Colour palette mapped to status ─────────────────────────────────────────
const STATUS_COLOURS: Record<AppointmentStatus | string, string> = {
  CONFIRMED:   '#6366f1',
  PENDING:     '#f59e0b',
  COMPLETED:   '#10b981',
  CANCELLED:   '#ef4444',
  NO_SHOW:     '#94a3b8',
  RESCHEDULED: '#8b5cf6',
};

const CHART_PRIMARY = '#6366f1';
const CHART_SECONDARY = '#a5b4fc';

// ─── KPI Stat Card ────────────────────────────────────────────────────────────
interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  delta?: string;
  deltaPositive?: boolean;
  icon: React.ReactNode;
  gradient: string;
  isLoading?: boolean;
}

function KpiCard({ title, value, subtitle, delta, deltaPositive, icon, gradient, isLoading }: KpiCardProps) {
  if (isLoading) return null; // handled by parent SkeletonStatCards

  return (
    <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className={`absolute inset-0 opacity-5 ${gradient}`} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${gradient} shadow-sm`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{subtitle}</span>
          {delta && (
            <span className={`text-xs font-medium ${deltaPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
              {deltaPositive ? '↑' : '↓'} {delta}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Tooltips & Labels ────────────────────────────────────────────────────────
function AreaTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold">{label}</p>
      <p className="text-primary">{payload[0].value} bookings</p>
    </div>
  );
}

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-lg text-sm space-y-1">
      <p className="font-semibold">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.fill }}>
          {p.name}: {p.dataKey === 'revenue' ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  
  const { data: bizResult } = useMyBusiness();
  const businessId = bizResult?.id ?? localStorage.getItem('businessId') ?? '';

  // API Hooks
  const { data: summary, isLoading: isLoadingSummary, isError: isErrorSum, error: errSum, refetch: refSum } = useDashboardSummary({ businessId });
  const { data: trends, isLoading: isLoadingTrends, isError: isErrorTr, error: errTr, refetch: refTr } = useRevenueTrends({ businessId, period: 'monthly' });
  const { data: popular, isLoading: isLoadingPop, isError: isErrorPop, error: errPop, refetch: refPop } = usePopularServices({ businessId, limit: 6 });
  const { data: statusDist, isLoading: isLoadingStatus, isError: isErrorStat, error: errStat, refetch: refStat } = useStatusDistribution({ businessId });
  const { data: apptData, isLoading: isLoadingAppt, isError: isErrorAppt, error: errAppt, refetch: refAppt } = useAppointments({ businessId, limit: 5 });

  const hasError = isErrorSum || isErrorTr || isErrorPop || isErrorStat || isErrorAppt;

  const handleRetry = () => {
    refSum(); refTr(); refPop(); refStat(); refAppt();
  };

  const appointments = apptData?.appointments ?? [];

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Welcome back, <span className="font-semibold text-foreground">{user?.name ?? 'there'}</span> 👋
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center rounded-full border bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600">
          Live Data Active
        </span>
      </div>

      {hasError && <ApiErrorBanner error={errSum || errTr || errPop || errStat || errAppt} retry={handleRetry} />}

      {/* ── KPI Cards ── */}
      {isLoadingSummary ? (
        <SkeletonStatCards count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Total Appointments"
            value={summary?.totalAppointments ?? 0}
            subtitle="All time"
            gradient="bg-gradient-to-br from-violet-500 to-indigo-600"
            icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          />
          <KpiCard
            title="Confirmed Appointments"
            value={summary?.confirmedAppointments ?? 0}
            subtitle="Awaiting completion"
            gradient="bg-gradient-to-br from-sky-500 to-cyan-600"
            icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <KpiCard
            title="Active Staff"
            value={summary?.activeStaff ?? 0}
            subtitle="Currently on roster"
            gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
            icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          />
          <KpiCard
            title="Total Revenue"
            value={formatCurrency(summary?.totalRevenue ?? 0)}
            subtitle="All time revenue"
            gradient="bg-gradient-to-br from-amber-500 to-orange-600"
            icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
        </div>
      )}

      {/* ── Charts Row 1 ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Booking Trends</CardTitle>
            <CardDescription>Monthly appointments over the past year</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingTrends ? <SkeletonCard rows={5} /> : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trends ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bookingGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={CHART_PRIMARY}   stopOpacity={0.25} />
                      <stop offset="95%" stopColor={CHART_PRIMARY}   stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<AreaTooltip />} />
                  <Area type="monotone" dataKey="appointments" stroke={CHART_PRIMARY} strokeWidth={2.5} fill="url(#bookingGradient)" dot={false} activeDot={{ r: 5, fill: CHART_PRIMARY, stroke: 'white', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Status Distribution</CardTitle>
            <CardDescription>Appointment outcomes breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStatus ? <SkeletonCard rows={5} /> : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={statusDist ?? []}
                    dataKey="count"
                    nameKey="status"
                    cx="50%" cy="45%"
                    outerRadius={85} innerRadius={42}
                    labelLine={false} label={PieLabel}
                  >
                    {(statusDist ?? []).map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLOURS[entry.status] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>{value}</span>} />
                  <Tooltip formatter={(value: any, name: any) => [`${value} bookings`, name]} contentStyle={{ borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-card)', color: 'var(--color-foreground)', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row 2 ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Popular Services</CardTitle>
          <CardDescription>Top services by booking count and revenue generated</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPop ? <SkeletonCard rows={5} /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={popular ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="serviceName" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip content={<BarTooltip />} />
                <Legend iconType="square" iconSize={10} formatter={(value) => <span style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>{value === 'bookingCount' ? 'Bookings' : 'Revenue (₹)'}</span>} />
                <Bar yAxisId="left"  dataKey="bookingCount" name="Bookings" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar yAxisId="right" dataKey="revenue" name="Revenue (₹)" fill={CHART_SECONDARY} radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Recent Appointments Table ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Recent Appointments</CardTitle>
            <CardDescription className="mt-1">Latest booked appointments across your platform</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingAppt ? <div className="p-6"><SkeletonTable cols={6} rows={5} /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Staff</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8">
                        <EmptyState 
                          title="No recent appointments" 
                          description="When customers book appointments, they will appear here."
                        />
                      </td>
                    </tr>
                  ) : appointments.map((appt) => {
                    const cfg = appointmentStatusConfig[appt.status] ?? { label: appt.status, color: '' };
                    return (
                      <tr key={appt.id} className="group transition-colors hover:bg-muted/20">
                        <td className="whitespace-nowrap px-6 py-4 font-medium">{appt.service?.serviceName ?? 'N/A'}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">{appt.customer?.name ?? 'Unknown'}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">{appt.staff?.user?.name ?? 'Unassigned'}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">{formatDate(appt.appointmentDate)}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">
                          {formatTime(appt.startTime)} – {formatTime(appt.endTime)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
