import { useState, useMemo } from 'react';
import {
  Search, Plus, Eye, Pencil, X, ChevronUp, ChevronDown,
  ChevronsUpDown, CalendarDays, Filter, CheckCircle2,
  Clock, XCircle, CheckCheck, RefreshCcw, MoreHorizontal,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { MultiStepBookingForm } from '../components/appointments/BookingForm';
import { EmptyState, SkeletonTable, ApiErrorBanner } from '../components/common';
import { cn } from '../lib/utils';
import { useAppointments, useCreateAppointment, useUpdateAppointment, useCancelAppointment } from '../hooks/queries';
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
    price: parseFloat(a.service?.price ?? '0'),
    notes: '', // Backend doesn't support notes yet
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

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ appt, onClose, onSave, isSaving, error }: { appt: ApptDisplay; onClose: () => void; onSave: (updated: Partial<ApptDisplay>) => void; isSaving?: boolean; error?: string | null }) {
  const [status, setStatus] = useState<AppointmentStatus>(appt.status);
  const [date, setDate] = useState(appt.date.split('T')[0]); // simplified
  const [startTime, setStartTime] = useState(appt.startTime);
  const [endTime, setEndTime] = useState(appt.endTime);
  const [notes, setNotes] = useState(appt.notes ?? '');

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-lg">
        <ModalHeader title="Edit Appointment" subtitle={appt.id.split('-')[0]} onClose={onClose} />
        {error && (
          <div className="mx-6 mt-4 rounded-lg bg-destructive/15 text-destructive text-sm font-medium p-3 border border-destructive/20 flex items-start gap-2">
            <span className="shrink-0 mt-0.5">⚠️</span>
            {error}
          </div>
        )}
        <div className="p-6 space-y-5">
          <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground space-y-1">
            <p><span className="font-medium text-foreground">{appt.service}</span> · {appt.customer}</p>
            <p>{appt.business} · {appt.staff}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as AppointmentStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_CONFIG) as AppointmentStatus[]).map(s => (
                  <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Start Time</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">End Time</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Add notes…" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
        </div>
        <div className="border-t px-6 py-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={() => onSave({ status, date, startTime, endTime, notes })} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
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
      await createReq.mutateAsync({
        businessId,
        serviceId: data.serviceId,
        staffId: data.staffId,
        appointmentDate: data.date,
        startTime: data.timeSlot,
        endTime: data.timeSlot, // Placeholder since form doesn't track end time explicitly
      });
      onClose();
    } catch (e: any) {
      console.error(e);
      setApiError(
        e.response?.data?.message || e.message || 'Failed to create appointment.'
      );
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-2xl bg-card rounded-xl">
        <ModalHeader title="New Appointment" subtitle="Follow the steps to book an appointment" onClose={onClose} />
        {apiError && (
          <div className="mx-6 mt-4 rounded-lg bg-destructive/15 text-destructive text-sm font-medium p-3 border border-destructive/20 flex items-start gap-2">
            <span className="shrink-0 mt-0.5">⚠️</span>
            {apiError}
          </div>
        )}
        <div className="p-6 relative">
          {createReq.isPending && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
              <span className="font-medium text-muted-foreground animate-pulse">Booking...</span>
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
  const [open, setOpen] = useState(false);
  const canCancel = appt.status === 'PENDING' || appt.status === 'CONFIRMED';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-1 w-44 rounded-lg border bg-card shadow-lg py-1">
            <MenuItem icon={<Eye className="h-3.5 w-3.5" />} label="View Details" onClick={() => { onView(); setOpen(false); }} />
            <MenuItem icon={<Pencil className="h-3.5 w-3.5" />} label="Edit" onClick={() => { onEdit(); setOpen(false); }} />
            {canCancel && (
              <>
                <div className="my-1 border-t" />
                <MenuItem icon={<XCircle className="h-3.5 w-3.5" />} label="Cancel" onClick={() => { onCancel(); setOpen(false); }} danger />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cn('flex w-full items-center gap-2.5 px-3 py-1.5 text-sm transition-colors hover:bg-accent', danger && 'text-destructive hover:text-destructive')}>
      {icon} {label}
    </button>
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

  const updateReq = useUpdateAppointment();
  const cancelReq = useCancelAppointment();

  const [search, setSearch]         = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AppointmentStatus>('ALL');
  const [sortKey, setSortKey]       = useState<SortKey>('date');
  const [sortDir, setSortDir]       = useState<SortDir>('desc');
  const [modal, setModal]           = useState<ModalState>({ type: 'none' });
  const [editError, setEditError]   = useState<string | null>(null);
  const [page, setPage]             = useState(1);
  const PAGE_SIZE = 8;

  // ── filter + sort ──
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

  const handleCancel = async (id: string) => {
    await cancelReq.mutateAsync(id);
  };

  const handleEdit = async (id: string, patch: Partial<ApptDisplay>) => {
    setEditError(null);
    try {
      await updateReq.mutateAsync({
        id,
        status: patch.status,
        appointmentDate: patch.date ? new Date(patch.date).toISOString() : undefined,
        startTime: patch.startTime,
        endTime: patch.endTime,
      });
      setModal({ type: 'none' });
    } catch (e: any) {
      console.error(e);
      setEditError(e.response?.data?.message || e.message || 'Failed to update appointment.');
    }
  };

  // summary counts
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
                        <RowActions appt={appt} onView={() => setModal({ type: 'view', appt })} onEdit={() => { setEditError(null); setModal({ type: 'edit', appt }); }} onCancel={() => handleCancel(appt.id)} />
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
      {modal.type === 'view' && <ViewModal appt={modal.appt} onClose={() => setModal({ type: 'none' })} />}
      {modal.type === 'edit' && (
        <EditModal 
          appt={modal.appt} 
          onClose={() => setModal({ type: 'none' })} 
          onSave={(p) => handleEdit(modal.appt.id, p)} 
          isSaving={updateReq.isPending}
          error={editError}
        />
      )}
      {modal.type === 'create' && <CreateModal onClose={() => setModal({ type: 'none' })} businessId={businessId} />}
    </div>
  );
}
