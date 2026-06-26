import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck, Clock, CalendarPlus,
  XCircle, RefreshCw, Star, Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { useAppointments, useCancelAppointment } from '../../hooks/queries/useAppointments';
import { formatDate, formatTime, formatCurrency } from '../../utils';
import type { Appointment, AppointmentStatus } from '../../types';
import { SkeletonCard, ApiErrorBanner } from '../../components/common';

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; cls: string }> = {
  CONFIRMED:   { label: 'Confirmed',   cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  PENDING:     { label: 'Pending',     cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  COMPLETED:   { label: 'Completed',   cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  CANCELLED:   { label: 'Cancelled',   cls: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200' },
  NO_SHOW:     { label: 'No Show',     cls: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' },
  RESCHEDULED: { label: 'Rescheduled', cls: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' },
};

// ─── Cancel Modal ─────────────────────────────────────────────────────────────
function CancelModal({ appt, onCancel, onClose, isCancelling }: {
  appt: Appointment; onCancel: () => void; onClose: () => void; isCancelling?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl border shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center">
            <XCircle className="h-4 w-4 text-rose-600" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Cancel Appointment</h3>
            <p className="text-xs text-muted-foreground">This action cannot be undone</p>
          </div>
        </div>
        <div className="bg-muted rounded-lg p-3.5 text-sm space-y-1">
          <p className="font-medium">{appt.service?.serviceName ?? 'Service'}</p>
          <p className="text-muted-foreground text-xs">{formatDate(appt.appointmentDate)} at {formatTime(appt.startTime)} · with {appt.staff?.user?.name ?? 'Unassigned'}</p>
        </div>
        <p className="text-sm text-muted-foreground">Are you sure you want to cancel? You can rebook at any time.</p>
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isCancelling}>Keep It</Button>
          <Button variant="destructive" size="sm" onClick={onCancel} disabled={isCancelling} className="gap-1.5">
            <XCircle className="h-3.5 w-3.5" /> {isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Rating Modal ─────────────────────────────────────────────────────────────
function RatingModal({ appt, onSubmit, onClose }: {
  appt: Appointment; onSubmit: () => void; onClose: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover]   = useState(0);
  const [comment, setComment] = useState('');

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl border shadow-xl w-full max-w-md p-6 space-y-4">
        <div>
          <h3 className="font-semibold">Rate Your Experience</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{appt.service?.serviceName} with {appt.staff?.user?.name}</p>
        </div>
        <div className="flex justify-center gap-1.5 py-2">
          {[1, 2, 3, 4, 5].map(s => (
            <button key={s} type="button" onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)} onClick={() => setRating(s)}>
              <Star className={cn('h-8 w-8 transition-colors', (hover || rating) >= s ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40')} />
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Tell us about your experience..."
          rows={3}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Skip</Button>
          <Button size="sm" onClick={onSubmit} disabled={!rating} className="gap-1.5">
            <Star className="h-3.5 w-3.5" /> Submit
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Appointment Row ──────────────────────────────────────────────────────────
function ApptCard({ appt, onCancel, onRate }: {
  appt: Appointment; onCancel: () => void; onRate: () => void;
}) {
  const cfg = STATUS_CONFIG[appt.status] || STATUS_CONFIG.PENDING;
  const canCancel = appt.status === 'PENDING' || appt.status === 'CONFIRMED' || appt.status === 'RESCHEDULED';
  const rated = false;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl border bg-muted flex items-center justify-center shrink-0">
          <CalendarCheck className="h-4.5 w-4.5 text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold">{appt.service?.serviceName ?? 'Unknown Service'}</p>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', cfg.cls)}>{cfg.label}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            with <span className="font-medium text-foreground">{appt.staff?.user?.name ?? 'Unassigned'}</span> · {appt.business?.businessName}
          </p>
          <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><CalendarCheck className="h-3 w-3" />{formatDate(appt.appointmentDate)}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(appt.startTime)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 pl-14 sm:pl-0">
        <span className="text-sm font-semibold text-foreground mr-1">{formatCurrency(appt.service?.price ?? 0)}</span>
        {canCancel && (
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/5" onClick={onCancel}>
            <XCircle className="h-3 w-3" /> Cancel
          </Button>
        )}
        <Link to="/portal/book">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
            <RefreshCw className="h-3 w-3" /> Rebook
          </Button>
        </Link>
        {appt.status === 'COMPLETED' && !rated && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onRate}>
            <Star className="h-3 w-3" /> Rate
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CustomerAppointments() {
  const { data: apptData, isLoading, isError, error, refetch } = useAppointments();
  const appointments = apptData?.appointments ?? [];

  const cancelReq = useCancelAppointment();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [rateTarget, setRateTarget]     = useState<Appointment | null>(null);

  const { upcoming, past, displayed } = useMemo(() => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const up: Appointment[] = [];
    const pa: Appointment[] = [];
    for (const a of appointments) {
      const aDate = new Date(`${a.appointmentDate.split('T')[0]}T${a.startTime}`);
      if (aDate >= now && a.status !== 'COMPLETED' && a.status !== 'CANCELLED' && a.status !== 'NO_SHOW') {
        up.push(a);
      } else {
        pa.push(a);
      }
    }
    up.sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());
    pa.sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());
    let disp = tab === 'upcoming' ? up : pa;
    if (statusFilter !== 'ALL') disp = disp.filter(a => a.status === statusFilter);
    return { upcoming: up, past: pa, displayed: disp };
  }, [appointments, tab, statusFilter]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try { await cancelReq.mutateAsync(cancelTarget.id); setCancelTarget(null); }
    catch (e) { console.error(e); }
  };
  const handleRate = () => { if (!rateTarget) return; setRateTarget(null); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Appointments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">View, manage, and rebook your appointments.</p>
        </div>
        <Link to="/portal/book">
          <Button className="gap-2 shrink-0"><CalendarPlus className="h-4 w-4" /> Book New</Button>
        </Link>
      </div>

      {isError && <ApiErrorBanner error={error} retry={refetch} />}

      {/* Tabs + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex border rounded-lg overflow-hidden">
          {(['upcoming', 'past'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2 text-sm font-medium capitalize transition-colors',
                tab === t
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {t}
              <span className={cn('ml-1.5 text-xs px-1.5 py-0.5 rounded-full', tab === t ? 'bg-primary-foreground/20' : 'bg-muted')}>
                {(t === 'upcoming' ? upcoming : past).length}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ALL">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* List */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm text-muted-foreground font-medium">{displayed.length} appointment{displayed.length !== 1 ? 's' : ''}</CardTitle>
        </CardHeader>
        {isLoading ? (
          <CardContent className="pt-4 space-y-3">
            <SkeletonCard rows={3} />
            <SkeletonCard rows={3} />
          </CardContent>
        ) : displayed.length === 0 ? (
          <CardContent className="py-16 flex flex-col items-center text-center gap-3">
            <div className="h-12 w-12 rounded-xl border bg-muted flex items-center justify-center">
              <CalendarCheck className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">No appointments found</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tab === 'upcoming' ? 'You have no upcoming appointments.' : 'No past appointments yet.'}
              </p>
            </div>
            <Link to="/portal/book">
              <Button variant="outline" size="sm" className="gap-2 mt-1">
                <CalendarPlus className="h-3.5 w-3.5" /> Book Now
              </Button>
            </Link>
          </CardContent>
        ) : (
          <div className="divide-y">
            {displayed.map(appt => (
              <ApptCard
                key={appt.id}
                appt={appt}
                onCancel={() => setCancelTarget(appt)}
                onRate={() => setRateTarget(appt)}
              />
            ))}
          </div>
        )}
      </Card>

      {cancelTarget && <CancelModal appt={cancelTarget} onCancel={handleCancel} onClose={() => setCancelTarget(null)} isCancelling={cancelReq.isPending} />}
      {rateTarget   && <RatingModal appt={rateTarget}  onSubmit={handleRate}   onClose={() => setRateTarget(null)} />}
    </div>
  );
}
