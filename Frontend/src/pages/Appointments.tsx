import { useState, useMemo } from 'react';
import {
  Search, Plus, Eye, Pencil, X, ChevronUp, ChevronDown,
  ChevronsUpDown, CalendarDays, Filter, CheckCircle2,
  Clock, XCircle, CheckCheck, RefreshCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { MultiStepBookingForm } from '../components/appointments/BookingForm';
import { EmptyState, SkeletonTable, ApiErrorBanner } from '../components/common';
import { ActionMenu, ActionMenuItem, ActionMenuSeparator } from '../components/ui/action-menu';
import { cn } from '../lib/utils';
import {
  useAppointments,
  useCreateAppointment,
  useUpdateAppointment,
  useUpdateAppointmentStatus,
  useCancelAppointment,
} from '../hooks/queries';
import { useMyBusiness } from '../hooks/queries/useBusiness';
import { formatTime, formatDate, formatCurrency } from '../utils';
import type { Appointment, AppointmentStatus } from '../types';

// ─── Display mapping ─────────────────────────────────────────────────────────
type ApptDisplay = {
  id: string;
  service: string;
  customer: string;
  customerEmail: string;
  business: string;
  staff: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  price: number;
  notes?: string;
};

function toDisplay(a: Appointment): ApptDisplay {
  return {
    id: a.id,
    service: a.service?.serviceName ?? 'Unknown Service',
    customer: a.customer?.name ?? 'Unknown Customer',
    customerEmail: a.customer?.email ?? 'N/A',
    business: a.business?.businessName ?? 'Unknown Business',
    staff: a.staff?.user?.name ?? 'Unassigned',
    date: a.appointmentDate,
    startTime: a.startTime,
    endTime: a.endTime,
    status: a.status,
    price: typeof a.service?.price === 'number' ? a.service.price : parseFloat(a.service?.price as any ?? '0'),
    notes: '',
  };
}

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<AppointmentStatus, { label: string; className: string; icon: React.ReactNode }> = {
  PENDING:     { label: 'Pending',     className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',   icon: <Clock className="h-3 w-3" /> },
  CONFIRMED:   { label: 'Confirmed',   className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',       icon: <CheckCircle2 className="h-3 w-3" /> },
  COMPLETED:   { label: 'Completed',   className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: <CheckCheck className="h-3 w-3" /> },
  CANCELLED:   { label: 'Cancelled',   className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',       icon: <XCircle className="h-3 w-3" /> },
  NO_SHOW:     { label: 'No Show',     className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',          icon: <XCircle className="h-3 w-3" /> },
  RESCHEDULED: { label: 'Rescheduled', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: <RefreshCcw className="h-3 w-3" /> },
};

function StatusPill({ status }: { status: AppointmentStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', cfg.className)}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Sort helper ──────────────────────────────────────────────────────────────
type SortKey = 'id' | 'customer' | 'service' | 'date' | 'status' | 'price';
type SortDir = 'asc' | 'desc';

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
  return sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5 text-primary" /> : <ChevronDown className="h-3.5 w-3.5 text-primary" />;
}

// ─── Shared modal primitives ─────────────────────────────────────────────────
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full max-w-xl animate-in fade-in-0 zoom-in-95 bg-card rounded-xl border shadow-2xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between border-b px-6 py-4">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

// ─── Inline error banner ──────────────────────────────────────────────────────
function InlineError({ message }: { message: string }) {
  return (
    <div className="mx-6 mt-4 rounded-lg bg-destructive/15 text-destructive text-sm font-medium p-3 border border-destructive/20 flex items-start gap-2">
      <span className="shrink-0 mt-0.5">⚠️</span>
      <span>{message}</span>
    </div>
  );
}

// ─── View Modal ───────────────────────────────────────────────────────────────
function ViewModal({ appt, onClose }: { appt: ApptDisplay; onClose: () => void }) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-lg">
        <ModalHeader title="Appointment Details" subtitle={appt.id.split('-')[0]} onClose={onClose} />
        <div className="p-6 space-y-4">
          <DetailRow label="Service" value={appt.service} />
          <DetailRow label="Customer" value={`${appt.customer} · ${appt.customerEmail}`} />
          <DetailRow label="Business" value={appt.business} />
          <DetailRow label="Staff Member" value={appt.staff} />
          <div className="grid grid-cols-2 gap-4">
            <DetailRow label="Date" value={formatDate(appt.date)} />
            <DetailRow label="Time" value={`${formatTime(appt.startTime)} – ${formatTime(appt.endTime)}`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <DetailRow label="Price" value={formatCurrency(appt.price)} />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
              <StatusPill status={appt.status} />
            </div>
          </div>
          {appt.notes && <DetailRow label="Notes" value={appt.notes} />}
        </div>
        <div className="border-t px-6 py-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Edit / Status Modal ──────────────────────────────────────────────────────
// This modal is used for two distinct operations:
//   1. Status-only change — handled by useUpdateAppointmentStatus (PATCH /:id/status)
//   2. Schedule change    — handled by useUpdateAppointment       (PATCH /:id)
// Separating these prevents date-format validation from blocking status updates.

interface EditModalProps {
  appt: ApptDisplay;
  onClose: () => void;
  onSaveStatus: (status: AppointmentStatus) => void;
  onSaveSchedule: (patch: { date: string; startTime: string; endTime: string }) => void;
  isSavingStatus: boolean;
  isSavingSchedule: boolean;
  error: string | null;
}

function EditModal({
  appt, onClose, onSaveStatus, onSaveSchedule,
  isSavingStatus, isSavingSchedule, error,
}: EditModalProps) {
  const [status, setStatus] = useState<AppointmentStatus>(appt.status);
  // Keep the raw YYYY-MM-DD part only, stripping any time component from ISO strings
  const [date, setDate] = useState(appt.date.slice(0, 10));
  const [startTime, setStartTime] = useState(appt.startTime);
  const [endTime, setEndTime] = useState(appt.endTime);

  const statusChanged   = status !== appt.status;
  const scheduleChanged = date !== appt.date.slice(0, 10) || startTime !== appt.startTime || endTime !== appt.endTime;
  const isSaving = isSavingStatus || isSavingSchedule;

  // Terminal statuses cannot be changed
  const isTerminal = ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appt.status);

  const handleSave = () => {
    if (statusChanged) {
      onSaveStatus(status);
    } else if (scheduleChanged) {
      onSaveSchedule({ date, startTime, endTime });
    }
  };

  const hasChanges = statusChanged || scheduleChanged;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-lg">
        <ModalHeader title="Edit Appointment" subtitle={`#${appt.id.split('-')[0]}`} onClose={onClose} />

        {error && <InlineError message={error} />}

        {isTerminal && (
          <div className="mx-6 mt-4 rounded-lg bg-muted/60 text-muted-foreground text-sm p-3 border border-border flex items-start gap-2">
            <span className="shrink-0 mt-0.5">ℹ️</span>
            <span>This appointment is in a terminal state (<strong>{STATUS_CONFIG[appt.status]?.label}</strong>) and its status cannot be changed.</span>
          </div>
        )}

        <div className="p-6 space-y-5">
          {/* Appointment summary */}
          <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground space-y-1">
            <p><span className="font-medium text-foreground">{appt.service}</span> · {appt.customer}</p>
            <p>{appt.business} · {appt.staff}</p>
          </div>

          {/* Status selector */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as AppointmentStatus)} disabled={isTerminal}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_CONFIG) as AppointmentStatus[]).map(s => (
                  <SelectItem key={s} value={s}>
                    <span className="inline-flex items-center gap-2">
                      {STATUS_CONFIG[s].icon}
                      {STATUS_CONFIG[s].label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {statusChanged && !isTerminal && (
              <p className="mt-1 text-xs text-muted-foreground">
                Changing: <strong>{STATUS_CONFIG[appt.status]?.label}</strong> → <strong>{STATUS_CONFIG[status]?.label}</strong>
              </p>
            )}
          </div>

          {/* Schedule fields — disabled when a status change is pending to avoid mixed operations */}
          <div className={cn('space-y-4 transition-opacity', statusChanged && 'opacity-40 pointer-events-none select-none')}>
            <div>
              <label className="block text-sm font-medium mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {statusChanged && scheduleChanged && (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-md p-2 border border-amber-200 dark:border-amber-800">
              ⚠️ Save status change first, then edit the schedule separately.
            </p>
          )}
        </div>

        <div className="border-t px-6 py-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving || isTerminal}>
            {isSaving ? 'Saving…' : statusChanged ? 'Update Status' : 'Save Schedule'}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}

function CreateModal({ onClose, businessId }: { onClose: () => void; businessId: string }) {
  const createReq = useCreateAppointment();
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSuccess = async (data: any) => {
    setApiError(null);
    try {
      const staffId    = data.staffId    && data.staffId    !== 'any' ? data.staffId    : undefined;
      const resourceId = data.resourceId && data.resourceId !== 'any' ? data.resourceId : undefined;

      const durationMinutes: number = data.durationMinutes ?? 30;
      const [startH, startM] = (data.timeSlot as string).split(':').map(Number);
      const endTotalMinutes = startH * 60 + startM + durationMinutes;
      const endTime = `${String(Math.floor(endTotalMinutes / 60) % 24).padStart(2, '0')}:${String(endTotalMinutes % 60).padStart(2, '0')}`;

      await createReq.mutateAsync({
        businessId,
        serviceId: data.serviceId,
        staffId,
        resourceId,
        appointmentDate: data.date,
        startTime: data.timeSlot,
        endTime,
      });
      toast.success('Appointment booked successfully!');
      onClose();
    } catch (e: any) {
      console.error(e);
      let errMsg = e.response?.data?.message || e.message || 'Failed to create appointment.';
      if (e.response?.data?.errors && Array.isArray(e.response.data.errors)) {
        errMsg = `${errMsg}: ${e.response.data.errors.join(' | ')}`;
      }
      setApiError(errMsg);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-2xl bg-card rounded-xl">
        <ModalHeader title="New Appointment" subtitle="Follow the steps to book an appointment" onClose={onClose} />
        {apiError && <InlineError message={apiError} />}
        <div className="p-6 relative">
          {createReq.isPending && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
              <span className="font-medium text-muted-foreground animate-pulse">Booking…</span>
            </div>
          )}
          <MultiStepBookingForm onSuccess={handleSuccess} onCancel={onClose} />
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Row action menu ──────────────────────────────────────────────────────────
function RowActions({ appt, onView, onEdit, onCancel }: {
  appt: ApptDisplay;
  onView: () => void;
  onEdit: () => void;
  onCancel: () => void;
}) {
  const canCancel = appt.status === 'PENDING' || appt.status === 'CONFIRMED';

  return (
    <ActionMenu>
      <ActionMenuItem icon={<Eye className="h-3.5 w-3.5" />} label="View Details" onClick={onView} />
      <ActionMenuItem icon={<Pencil className="h-3.5 w-3.5" />} label="Edit" onClick={onEdit} />
      {canCancel && (
        <>
          <ActionMenuSeparator />
          <ActionMenuItem icon={<XCircle className="h-3.5 w-3.5" />} label="Cancel" onClick={onCancel} danger />
        </>
      )}
    </ActionMenu>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type ModalState =
  | { type: 'none' }
  | { type: 'view';   appt: ApptDisplay }
  | { type: 'edit';   appt: ApptDisplay }
  | { type: 'create' };

const ALL_STATUSES: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'];

export default function AppointmentsPage() {
  const { data: bizResult } = useMyBusiness();
  const businessId = bizResult?.id ?? localStorage.getItem('businessId') ?? '';

  const { data: apptData, isLoading, isError, error, refetch } = useAppointments({ businessId });
  const rawAppointments = apptData?.appointments ?? [];
  const appointments: ApptDisplay[] = rawAppointments.map(toDisplay);

  // Mutations
  const updateStatusReq   = useUpdateAppointmentStatus();
  const updateScheduleReq = useUpdateAppointment();
  const cancelReq         = useCancelAppointment();

  const [search, setSearch]             = useState('');
  const [dateFilter, setDateFilter]     = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AppointmentStatus>('ALL');
  const [sortKey, setSortKey]           = useState<SortKey>('date');
  const [sortDir, setSortDir]           = useState<SortDir>('desc');
  const [modal, setModal]               = useState<ModalState>({ type: 'none' });
  const [editError, setEditError]       = useState<string | null>(null);
  const [page, setPage]                 = useState(1);
  const PAGE_SIZE = 8;

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = [...appointments];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.customer.toLowerCase().includes(q) ||
        r.service.toLowerCase().includes(q) ||
        r.staff.toLowerCase().includes(q)
      );
    }
    if (dateFilter) rows = rows.filter(r => r.date.startsWith(dateFilter));
    if (statusFilter !== 'ALL') rows = rows.filter(r => r.status === statusFilter);

    rows.sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      const va = a[sortKey as keyof ApptDisplay] as string | number;
      const vb = b[sortKey as keyof ApptDisplay] as string | number;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * mul;
      return String(va).localeCompare(String(vb)) * mul;
    });
    return rows;
  }, [appointments, search, dateFilter, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const handleFilterChange = (fn: () => void) => { fn(); setPage(1); };

  // ── Cancel handler ─────────────────────────────────────────────────────────
  const handleCancel = async (id: string) => {
    try {
      await cancelReq.mutateAsync(id);
      toast.success('Appointment cancelled.');
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || 'Failed to cancel appointment.';
      toast.error(msg);
    }
  };

  // ── Status update handler ──────────────────────────────────────────────────
  const handleStatusUpdate = async (id: string, status: AppointmentStatus) => {
    setEditError(null);
    try {
      await updateStatusReq.mutateAsync({ id, status });
      toast.success(`Status updated to ${STATUS_CONFIG[status]?.label ?? status}.`);
      setModal({ type: 'none' });
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || 'Failed to update appointment status.';
      setEditError(msg);
      // Don't toast here — the inline error in the modal is sufficient
    }
  };

  // ── Schedule update handler ────────────────────────────────────────────────
  const handleScheduleUpdate = async (id: string, patch: { date: string; startTime: string; endTime: string }) => {
    setEditError(null);
    try {
      await updateScheduleReq.mutateAsync({
        id,
        // date is already YYYY-MM-DD from the <input type="date"> value
        appointmentDate: patch.date,
        startTime: patch.startTime,
        endTime: patch.endTime,
      });
      toast.success('Appointment schedule updated.');
      setModal({ type: 'none' });
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || 'Failed to update appointment schedule.';
      setEditError(msg);
    }
  };

  // ── Summary counts ─────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c: Partial<Record<AppointmentStatus | 'ALL', number>> = { ALL: appointments.length };
    ALL_STATUSES.forEach(s => { c[s] = appointments.filter(a => a.status === s).length; });
    return c;
  }, [appointments]);

  const ThCell = ({ col, label }: { col: SortKey; label: string }) => (
    <th className="cursor-pointer select-none px-4 py-3 text-left" onClick={() => handleSort(col)}>
      <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
        {label} <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </span>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {appointments.length} total · {counts['PENDING'] ?? 0} pending · {counts['CONFIRMED'] ?? 0} confirmed
          </p>
        </div>
        <Button onClick={() => setModal({ type: 'create' })} className="gap-2">
          <Plus className="h-4 w-4" /> New Appointment
        </Button>
      </div>

      {isError && <ApiErrorBanner error={error} retry={refetch} />}

      {/* ── Status pills ── */}
      <div className="flex gap-2 flex-wrap">
        {(['ALL', ...ALL_STATUSES] as const).map(s => {
          const isActive = statusFilter === s;
          const cfg = s !== 'ALL' ? STATUS_CONFIG[s] : null;
          return (
            <button
              key={s}
              onClick={() => handleFilterChange(() => setStatusFilter(s))}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground'
              )}
            >
              {cfg?.icon}
              {s === 'ALL' ? 'All' : cfg?.label}
              <span className={cn('rounded-full px-1.5 py-0.5 text-[10px]', isActive ? 'bg-white/20' : 'bg-muted')}>
                {counts[s] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Data Table Card ── */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center border-b py-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text" placeholder="Search customer, service…" value={search}
              onChange={e => handleFilterChange(() => setSearch(e.target.value))}
              className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="date" value={dateFilter}
                onChange={e => handleFilterChange(() => setDateFilter(e.target.value))}
                className="rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {(search || dateFilter || statusFilter !== 'ALL') && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setDateFilter(''); setStatusFilter('ALL'); setPage(1); }} className="gap-1.5 text-muted-foreground">
                <Filter className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><SkeletonTable cols={6} rows={5} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <ThCell col="id"       label="ID"       />
                    <ThCell col="customer" label="Customer" />
                    <ThCell col="service"  label="Service"  />
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Staff</th>
                    <ThCell col="date"   label="Date / Time" />
                    <ThCell col="price"  label="Price"       />
                    <ThCell col="status" label="Status"      />
                    <th className="w-12 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8">
                        <EmptyState
                          icon={<CalendarDays className="h-7 w-7" />}
                          title="No appointments found"
                          description="Try adjusting your search filters or create a new appointment."
                        />
                      </td>
                    </tr>
                  ) : pageRows.map(appt => (
                    <tr key={appt.id} className="group transition-colors hover:bg-muted/20">
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className="font-mono text-xs text-muted-foreground">{appt.id.split('-')[0]}...</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium whitespace-nowrap">{appt.customer}</p>
                        <p className="text-xs text-muted-foreground">{appt.customerEmail}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-medium">{appt.service}</td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm text-muted-foreground">{appt.staff}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="whitespace-nowrap text-sm font-medium">{formatDate(appt.date)}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(appt.startTime)} – {formatTime(appt.endTime)}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-semibold">{formatCurrency(appt.price)}</td>
                      <td className="whitespace-nowrap px-4 py-3.5"><StatusPill status={appt.status} /></td>
                      <td className="px-4 py-3.5">
                        <RowActions
                          appt={appt}
                          onView={() => setModal({ type: 'view', appt })}
                          onEdit={() => { setEditError(null); setModal({ type: 'edit', appt }); }}
                          onCancel={() => handleCancel(appt.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(!isLoading && totalPages > 1) && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">Page {page} of {totalPages} · {filtered.length} results</p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)} className={cn('h-8 w-8 rounded-md text-xs font-medium transition-colors', p === page ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground')}>
                    {p}
                  </button>
                ))}
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Modals ── */}
      {modal.type === 'view' && (
        <ViewModal appt={modal.appt} onClose={() => setModal({ type: 'none' })} />
      )}
      {modal.type === 'edit' && (
        <EditModal
          appt={modal.appt}
          onClose={() => { setEditError(null); setModal({ type: 'none' }); }}
          onSaveStatus={(status) => handleStatusUpdate(modal.appt.id, status)}
          onSaveSchedule={(patch) => handleScheduleUpdate(modal.appt.id, patch)}
          isSavingStatus={updateStatusReq.isPending}
          isSavingSchedule={updateScheduleReq.isPending}
          error={editError}
        />
      )}
      {modal.type === 'create' && (
        <CreateModal onClose={() => setModal({ type: 'none' })} businessId={businessId} />
      )}
    </div>
  );
}
