import { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  ComposedChart, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Card, CardContent, CardHeader,
} from '../components/ui/card';
import {
  DollarSign, CalendarCheck, Star, Activity,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { useMyBusiness } from '../hooks/queries/useBusiness';
import {
  useDashboardSummary,
  useRevenueTrends,
  usePopularServices,
  useStaffUtilization,
} from '../hooks/queries/useDashboard';
import { cn } from '../lib/utils';
import { formatCurrency } from '../utils';
import { SkeletonCard } from '../components/common';

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, prefix = '', suffix = '' }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-card/95 backdrop-blur-sm px-4 py-3 shadow-xl text-sm min-w-[140px]">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground capitalize">{p.name}</span>
          </div>
          <span className="font-semibold text-foreground">
            {prefix}{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}{suffix}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Period Tabs ──────────────────────────────────────────────────────────────
type Period = 'daily' | 'weekly' | 'monthly';
function PeriodTab({ period, active, onClick }: { period: Period; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      )}
    >
      {period}
    </button>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
interface KPIProps {
  title: string;
  value: string;
  sub: string;
  change: number;
  icon: React.ReactNode;
  gradient: string;
  sparkData?: number[];
}

function KPICard({ title, value, sub, change, icon, gradient, sparkData }: KPIProps) {
  const positive = change >= 0;
  return (
    <Card className={cn('relative overflow-hidden border-0 text-white shadow-lg', gradient)}>
      {/* Decorative blobs */}
      <div className="absolute -top-6 -right-6 h-28 w-28 rounded-full bg-white/10" />
      <div className="absolute -bottom-8 -right-2 h-20 w-20 rounded-full bg-white/5" />

      <CardContent className="relative p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-white/70">{title}</p>
            <p className="mt-1.5 text-3xl font-bold tracking-tight">{value}</p>
            <div className={cn('mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', positive ? 'bg-white/20 text-white' : 'bg-white/20 text-white')}>
              {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(change)}% vs last month
            </div>
            <p className="mt-1.5 text-xs text-white/60">{sub}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-white/20 shrink-0">{icon}</div>
        </div>

        {/* Sparkline */}
        {sparkData && (
          <div className="mt-4 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData.map((v, i) => ({ v, i }))}>
                <Line type="monotone" dataKey="v" stroke="rgba(255,255,255,0.7)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      {action}
    </div>
  );
}

// ─── Utilization Ring ─────────────────────────────────────────────────────────
function UtilRing({ value, color }: { value: number; color: string }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="5" className="text-muted/30" />
      <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" className="transition-all duration-700" />
    </svg>
  );
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const revenueSpark = [30, 40, 45, 50, 49, 60, 70, 91, 125, 130];
const RESOURCE_UTILIZATION = [
  { name: 'Room 1', utilization: 85, bookings: 124, fill: '#10b981' },
  { name: 'Room 2', utilization: 65, bookings: 98, fill: '#6366f1' },
  { name: 'Equipment A', utilization: 45, bookings: 42, fill: '#f59e0b' },
];

// ─── Main Analytics Page ──────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [bookingPeriod, setBookingPeriod] = useState<Period>('monthly');

  const { data: bizResult } = useMyBusiness();
  const businessId = bizResult?.id ?? localStorage.getItem('businessId') ?? '';

  const { data: summary, isLoading: loadingSummary } = useDashboardSummary({ businessId });
  const { data: trends, isLoading: loadingTrends } = useRevenueTrends({ businessId, period: bookingPeriod });
  const { data: pop, isLoading: loadingPop } = usePopularServices({ businessId, limit: 1 });
  const { data: staff, isLoading: loadingStaff } = useStaffUtilization({ businessId });

  // Compute derived data
  const totalRevenue = summary?.totalRevenue ?? 0;
  const totalAppts   = summary?.totalAppointments ?? 0;
  
  // Create safe arrays
  const safeTrends = trends ?? [];
  const safeStaff = staff ?? [];

  // Re-map trends to include profit/expenses if not provided by backend (assuming 38% profit margin for visuals)
  const chartTrends = safeTrends.map(t => ({
    period: t.period,
    revenue: t.revenue,
    bookings: t.appointments,
    profit: Math.round(t.revenue * 0.38),
    expenses: Math.round(t.revenue * 0.62),
    prevYear: t.appointments > 10 ? t.appointments - 5 : 0 // Fake YOY data for chart since backend doesn't provide it yet
  }));

  const mostPopular = pop?.[0] ? pop[0].serviceName : 'No data';
  const mostPopularSub = pop?.[0] ? `${pop[0].bookingCount} bookings · ${formatCurrency(pop[0].revenue)} revenue` : 'No bookings yet';

  const avgUtil = safeStaff.length > 0 
    ? Math.round(safeStaff.reduce((acc, s) => acc + (s.utilizationRate ?? 0), 0) / safeStaff.length) 
    : 0;

  const isLoading = loadingSummary || loadingTrends || loadingPop || loadingStaff;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {Array.from({length: 4}).map((_, i) => <SkeletonCard key={i} rows={2} />)}
        </div>
        <SkeletonCard rows={8} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Executive overview · Mock data · FY 2024</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 border rounded-lg px-3 py-2">
          <Activity className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
          Live data sync enabled
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <KPICard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          sub="All services · Jan–Dec 2024"
          change={18}
          icon={<DollarSign className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700"
          sparkData={revenueSpark}
        />
        <KPICard
          title="Total Appointments"
          value={totalAppts.toLocaleString()}
          sub="Across all staff & services"
          change={24}
          icon={<CalendarCheck className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-violet-500 via-violet-600 to-purple-700"
          sparkData={safeTrends.slice(-6).map(m => m.appointments)}
        />
        <KPICard
          title="Most Popular Service"
          value={mostPopular}
          sub={mostPopularSub}
          change={12}
          icon={<Star className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-rose-500 via-pink-600 to-rose-700"
        />
        <KPICard
          title="Avg Staff Utilization"
          value={`${avgUtil}%`}
          sub="Across all active staff"
          change={7}
          icon={<Activity className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700"
        />
      </div>

      {/* ── Bookings Chart (period-switchable) ── */}
      <Card className="shadow-sm">
        <CardHeader>
          <SectionHeader
            title="Booking Volume"
            description="Appointments over selected time period"
            action={
              <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border">
                {(['daily', 'weekly', 'monthly'] as Period[]).map(p => (
                  <PeriodTab key={p} period={p} active={bookingPeriod === p} onClick={() => setBookingPeriod(p)} />
                ))}
              </div>
            }
          />
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartTrends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="gradBookings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrency(v)} />
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="circle" iconSize={8} />
              <Area yAxisId="left" type="monotone" dataKey="bookings" name="Bookings" fill="url(#gradBookings)" stroke="#6366f1" strokeWidth={2.5} dot={false} />
              <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill="#a78bfa" opacity={0.4} radius={[3, 3, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Revenue Trend ── */}
      <Card className="shadow-sm">
        <CardHeader>
          <SectionHeader title="Revenue Trend" description="Monthly revenue, profit & expenses breakdown · FY 2024" />
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartTrends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="gradRevenue2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradExpenses2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrency(v)} />
              <Tooltip content={<ChartTooltip prefix="₹" />} />
              <Legend iconType="circle" iconSize={8} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" fill="url(#gradRevenue2)" strokeWidth={2.5} dot={false} />
              <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fill="url(#gradProfit)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f43f5e" fill="url(#gradExpenses2)" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Resource Utilization + Staff Utilization ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Resource Utilization */}
        <Card className="shadow-sm">
          <CardHeader>
            <SectionHeader title="Resource Utilization" description="Booking rate per resource this month" />
          </CardHeader>
          <CardContent className="space-y-5">
            {RESOURCE_UTILIZATION.map(r => (
              <div key={r.name} className="flex items-center gap-4">
                <UtilRing value={r.utilization} color={r.fill} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    <span className={cn('text-sm font-bold', r.utilization >= 80 ? 'text-emerald-500' : r.utilization >= 50 ? 'text-primary' : 'text-amber-500')}>
                      {r.utilization}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted">
                    <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${r.utilization}%`, background: r.fill }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{r.bookings} bookings this month</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Staff Utilization */}
        <Card className="shadow-sm">
          <CardHeader>
            <SectionHeader title="Staff Utilization" description="Appointments & capacity rate per team member" />
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={safeStaff} layout="vertical" margin={{ top: 0, right: 50, left: 0, bottom: 0 }} barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="staffName" width={92} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip suffix="%" />} />
                <Bar dataKey="utilizationRate" name="Utilization" radius={[0, 4, 4, 0]}
                  label={{ position: 'right', formatter: (v: any) => `${v}%`, fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}>
                  {safeStaff.map((_entry, index) => {
                    const colors = ['#6366f1', '#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd'];
                    return <Cell key={index} fill={colors[index % colors.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Staff table summary */}
            <div className="mt-4 divide-y divide-border">
              {safeStaff.map(s => (
                <div key={s.staffName} className="flex items-center justify-between py-2.5 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      {s.staffName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{s.staffName}</p>
                      <p className="text-muted-foreground">{s.totalAppointments} appts</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <span className={cn('font-semibold text-sm', s.utilizationRate >= 80 ? 'text-emerald-500' : s.utilizationRate >= 60 ? 'text-primary' : 'text-amber-500')}>
                      {s.utilizationRate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Year-over-Year Comparison ── */}
      <Card className="shadow-sm">
        <CardHeader>
          <SectionHeader title="Year-over-Year Bookings" description="Current year vs previous year" />
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartTrends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} barGap={4} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend iconType="circle" iconSize={8} />
              <Bar dataKey="bookings" name="2024" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="prevYear" name="2023" fill="#c4b5fd" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
