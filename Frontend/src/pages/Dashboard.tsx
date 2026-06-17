import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../components/ui/card';
import { useAuth } from '../context/AuthContext';
import { appointmentStatusConfig, formatDate, formatTime } from '../utils';
import type { AppointmentStatus } from '../types';

// ─── Mock Data ────────────────────────────────────────────────────────────────
const BOOKING_TRENDS = [
  { month: 'Jan', bookings: 42 },
  { month: 'Feb', bookings: 58 },
  { month: 'Mar', bookings: 75 },
  { month: 'Apr', bookings: 63 },
  { month: 'May', bookings: 91 },
  { month: 'Jun', bookings: 87 },
  { month: 'Jul', bookings: 110 },
  { month: 'Aug', bookings: 98 },
  { month: 'Sep', bookings: 124 },
  { month: 'Oct', bookings: 118 },
  { month: 'Nov', bookings: 139 },
  { month: 'Dec', bookings: 152 },
];

const STATUS_DISTRIBUTION = [
  { name: 'Confirmed',   value: 45, status: 'CONFIRMED'   as AppointmentStatus },
  { name: 'Pending',     value: 20, status: 'PENDING'     as AppointmentStatus },
  { name: 'Completed',   value: 30, status: 'COMPLETED'   as AppointmentStatus },
  { name: 'Cancelled',   value: 10, status: 'CANCELLED'   as AppointmentStatus },
  { name: 'No Show',     value: 5,  status: 'NO_SHOW'     as AppointmentStatus },
];

const POPULAR_SERVICES = [
  { service: 'Hair Cut',      bookings: 89, revenue: 2670 },
  { service: 'Facial',        bookings: 72, revenue: 5040 },
  { service: 'Massage',       bookings: 65, revenue: 6500 },
  { service: 'Nail Art',      bookings: 58, revenue: 1740 },
  { service: 'Beard Trim',    bookings: 47, revenue: 940  },
  { service: 'Waxing',        bookings: 39, revenue: 1560 },
];

const RECENT_APPOINTMENTS = [
  {
    id: '1',
    service: 'Hair Cut',
    business: 'Style Studio',
    customer: 'Alice Johnson',
    date: '2024-12-20',
    startTime: '09:00:00',
    endTime: '09:30:00',
    status: 'CONFIRMED' as AppointmentStatus,
  },
  {
    id: '2',
    service: 'Facial',
    business: 'Glow Spa',
    customer: 'Bob Smith',
    date: '2024-12-20',
    startTime: '10:00:00',
    endTime: '11:00:00',
    status: 'PENDING' as AppointmentStatus,
  },
  {
    id: '3',
    service: 'Massage',
    business: 'Serenity Wellness',
    customer: 'Carol White',
    date: '2024-12-19',
    startTime: '14:00:00',
    endTime: '15:00:00',
    status: 'COMPLETED' as AppointmentStatus,
  },
  {
    id: '4',
    service: 'Nail Art',
    business: 'Polish Bar',
    customer: 'Diana Lee',
    date: '2024-12-19',
    startTime: '11:30:00',
    endTime: '12:30:00',
    status: 'CANCELLED' as AppointmentStatus,
  },
  {
    id: '5',
    service: 'Beard Trim',
    business: 'The Barber Collective',
    customer: 'Ethan Brown',
    date: '2024-12-18',
    startTime: '16:00:00',
    endTime: '16:30:00',
    status: 'CONFIRMED' as AppointmentStatus,
  },
];

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
}

function KpiCard({ title, value, subtitle, delta, deltaPositive, icon, gradient }: KpiCardProps) {
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

// ─── Custom Tooltip for Area chart ───────────────────────────────────────────
function AreaTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold">{label}</p>
      <p className="text-primary">{payload[0].value} bookings</p>
    </div>
  );
}

// ─── Custom Tooltip for Bar chart ────────────────────────────────────────────
function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-lg text-sm space-y-1">
      <p className="font-semibold">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.fill }}>
          {p.name}: {p.dataKey === 'revenue' ? `$${p.value.toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Custom Pie Label ─────────────────────────────────────────────────────────
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Welcome back,{' '}
            <span className="font-semibold text-foreground">{user?.name ?? 'there'}</span> 👋
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          Mock data · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total Appointments"
          value="1,284"
          subtitle="All time"
          delta="12% this month"
          deltaPositive
          gradient="bg-gradient-to-br from-violet-500 to-indigo-600"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <KpiCard
          title="Today's Appointments"
          value="24"
          subtitle="Scheduled for today"
          delta="3 more than yesterday"
          deltaPositive
          gradient="bg-gradient-to-br from-sky-500 to-cyan-600"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <KpiCard
          title="Active Staff"
          value="18"
          subtitle="Currently on roster"
          delta="2 on leave"
          deltaPositive={false}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <KpiCard
          title="Available Resources"
          value="31"
          subtitle="Ready to use"
          delta="5 in maintenance"
          deltaPositive={false}
          gradient="bg-gradient-to-br from-amber-500 to-orange-600"
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
      </div>

      {/* ── Charts Row 1 ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Booking Trends (2/3 width) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Booking Trends</CardTitle>
            <CardDescription>Monthly appointments over the past year</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={BOOKING_TRENDS} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="bookingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={CHART_PRIMARY}   stopOpacity={0.25} />
                    <stop offset="95%" stopColor={CHART_PRIMARY}   stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<AreaTooltip />} />
                <Area
                  type="monotone"
                  dataKey="bookings"
                  stroke={CHART_PRIMARY}
                  strokeWidth={2.5}
                  fill="url(#bookingGradient)"
                  dot={false}
                  activeDot={{ r: 5, fill: CHART_PRIMARY, stroke: 'white', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution (1/3 width) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Status Distribution</CardTitle>
            <CardDescription>Appointment outcomes breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={STATUS_DISTRIBUTION}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  outerRadius={85}
                  innerRadius={42}
                  labelLine={false}
                  label={PieLabel}
                >
                  {STATUS_DISTRIBUTION.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={STATUS_COLOURS[entry.status] ?? '#94a3b8'}
                    />
                  ))}
                </Pie>
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>{value}</span>
                  )}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [`${value}%`, name]}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-card)',
                    color: 'var(--color-foreground)',
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
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
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={POPULAR_SERVICES} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="service" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip content={<BarTooltip />} />
              <Legend
                iconType="square"
                iconSize={10}
                formatter={(value) => (
                  <span style={{ fontSize: 12, color: 'var(--color-muted-foreground)' }}>
                    {value === 'bookings' ? 'Bookings' : 'Revenue ($)'}
                  </span>
                )}
              />
              <Bar yAxisId="left"  dataKey="bookings" name="Bookings"    fill={CHART_PRIMARY}    radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar yAxisId="right" dataKey="revenue"  name="Revenue ($)" fill={CHART_SECONDARY}  radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Recent Appointments Table ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Recent Appointments</CardTitle>
            <CardDescription className="mt-1">Last 5 booked appointments across your platform</CardDescription>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {RECENT_APPOINTMENTS.length} shown
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Business</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {RECENT_APPOINTMENTS.map((appt) => {
                  const cfg = appointmentStatusConfig[appt.status] ?? { label: appt.status, color: '' };
                  return (
                    <tr
                      key={appt.id}
                      className="group transition-colors hover:bg-muted/20"
                    >
                      <td className="whitespace-nowrap px-6 py-4 font-medium">{appt.service}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">{appt.customer}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">{appt.business}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">
                        {formatDate(appt.date)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">
                        {formatTime(appt.startTime)} – {formatTime(appt.endTime)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}
                        >
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
