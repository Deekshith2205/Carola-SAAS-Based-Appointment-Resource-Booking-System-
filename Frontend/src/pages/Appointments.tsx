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
import { cn } from '../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
type ApptStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED';

interface MockAppointment {
  id: string;
  service: string;
  customer: string;
  customerEmail: string;
  business: string;
  staff: string;
  date: string;
  startTime: string;
  endTime: string;
  status: ApptStatus;
  price: number;
  notes?: string;
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────
const MOCK_APPOINTMENTS: MockAppointment[] = [
  { id: 'APT-001', service: 'Hair Cut', customer: 'Alice Johnson', customerEmail: 'alice@example.com', business: 'Style Studio', staff: 'Maria Garcia', date: '2024-12-20', startTime: '09:00', endTime: '09:30', status: 'CONFIRMED', price: 35, notes: 'Regular customer, prefers scissor cut' },
  { id: 'APT-002', service: 'Facial Treatment', customer: 'Bob Smith', customerEmail: 'bob@example.com', business: 'Glow Spa', staff: 'John Doe', date: '2024-12-20', startTime: '10:00', endTime: '11:00', status: 'PENDING', price: 75 },
  { id: 'APT-003', service: 'Deep Tissue Massage', customer: 'Carol White', customerEmail: 'carol@example.com', business: 'Serenity Wellness', staff: 'Sam Lee', date: '2024-12-19', startTime: '14:00', endTime: '15:00', status: 'COMPLETED', price: 100, notes: 'Focus on upper back' },
  { id: 'APT-004', service: 'Nail Art', customer: 'Diana Lee', customerEmail: 'diana@example.com', business: 'Polish Bar', staff: 'Anna Kim', date: '2024-12-19', startTime: '11:30', endTime: '12:30', status: 'CANCELLED', price: 45 },
  { id: 'APT-005', service: 'Beard Trim', customer: 'Ethan Brown', customerEmail: 'ethan@example.com', business: 'The Barber Collective', staff: 'Mike Chen', date: '2024-12-18', startTime: '16:00', endTime: '16:30', status: 'CONFIRMED', price: 20 },
  { id: 'APT-006', service: 'Waxing', customer: 'Fiona Green', customerEmail: 'fiona@example.com', business: 'Glow Spa', staff: 'John Doe', date: '2024-12-18', startTime: '13:00', endTime: '13:45', status: 'PENDING', price: 55 },
  { id: 'APT-007', service: 'Hair Colouring', customer: 'George Wilson', customerEmail: 'george@example.com', business: 'Style Studio', staff: 'Maria Garcia', date: '2024-12-17', startTime: '10:00', endTime: '12:00', status: 'COMPLETED', price: 150, notes: 'Full highlights' },
  { id: 'APT-008', service: 'Swedish Massage', customer: 'Helen Turner', customerEmail: 'helen@example.com', business: 'Serenity Wellness', staff: 'Sam Lee', date: '2024-12-17', startTime: '15:00', endTime: '16:00', status: 'NO_SHOW', price: 80 },
  { id: 'APT-009', service: 'Manicure', customer: 'Ivan Black', customerEmail: 'ivan@example.com', business: 'Polish Bar', staff: 'Anna Kim', date: '2024-12-16', startTime: '09:30', endTime: '10:00', status: 'CONFIRMED', price: 30 },
  { id: 'APT-010', service: 'Hair Cut', customer: 'Julia Ross', customerEmail: 'julia@example.com', business: 'Style Studio', staff: 'Mike Chen', date: '2024-12-16', startTime: '11:00', endTime: '11:30', status: 'RESCHEDULED', price: 35 },
  { id: 'APT-011', service: 'Hot Stone Massage', customer: 'Kevin Park', customerEmail: 'kevin@example.com', business: 'Serenity Wellness', staff: 'Sam Lee', date: '2024-12-21', startTime: '13:00', endTime: '14:30', status: 'PENDING', price: 120 },
  { id: 'APT-012', service: 'Eyebrow Threading', customer: 'Laura Adams', customerEmail: 'laura@example.com', business: 'Glow Spa', staff: 'Anna Kim', date: '2024-12-21', startTime: '14:00', endTime: '14:30', status: 'CONFIRMED', price: 25 },
];

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<ApptStatus, { label: string; className: string; icon: React.ReactNode }> = {
  PENDING:     { label: 'Pending',     className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',   icon: <Clock className="h-3 w-3" /> },
  CONFIRMED:   { label: 'Confirmed',   className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',       icon: <CheckCircle2 className="h-3 w-3" /> },
  COMPLETED:   { label: 'Completed',   className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: <CheckCheck className="h-3 w-3" /> },
  CANCELLED:   { label: 'Cancelled',   className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',       icon: <XCircle className="h-3 w-3" /> },
  NO_SHOW:     { label: 'No Show',     className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',          icon: <XCircle className="h-3 w-3" /> },
  RESCHEDULED: { label: 'Rescheduled', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: <RefreshCcw className="h-3 w-3" /> },
};

function StatusBadge({ status }: { status: ApptStatus }) {
  const cfg = STATUS_CONFIG[status];
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
  return sortDir === 'asc'
    ? <ChevronUp className="h-3.5 w-3.5 text-primary" />
    : <ChevronDown className="h-3.5 w-3.5 text-primary" />;
}

// ─── View Modal ───────────────────────────────────────────────────────────────
function ViewModal({ appt, onClose }: { appt: MockAppointment; onClose: () => void }) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-lg">
        <ModalHeader title="Appointment Details" subtitle={appt.id} onClose={onClose} />
        <div className="p-6 space-y-4">
          <DetailRow label="Service" value={appt.service} />
          <DetailRow label="Customer" value={`${appt.customer} · ${appt.customerEmail}`} />
          <DetailRow label="Business" value={appt.business} />
          <DetailRow label="Staff Member" value={appt.staff} />
          <div className="grid grid-cols-2 gap-4">
            <DetailRow label="Date" value={new Date(appt.date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })} />
            <DetailRow label="Time" value={`${appt.startTime} – ${appt.endTime}`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <DetailRow label="Price" value={`$${appt.price}`} />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
              <StatusBadge status={appt.status} />
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ appt, onClose, onSave }: { appt: MockAppointment; onClose: () => void; onSave: (updated: Partial<MockAppointment>) => void }) {
  const [status, setStatus] = useState<ApptStatus>(appt.status);
  const [date, setDate] = useState(appt.date);
  const [startTime, setStartTime] = useState(appt.startTime);
  const [endTime, setEndTime] = useState(appt.endTime);
  const [notes, setNotes] = useState(appt.notes ?? '');

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-lg">
        <ModalHeader title="Edit Appointment" subtitle={appt.id} onClose={onClose} />
        <div className="p-6 space-y-5">
          {/* Read-only info */}
          <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground space-y-1">
            <p><span className="font-medium text-foreground">{appt.service}</span> · {appt.customer}</p>
            <p>{appt.business} · {appt.staff}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as ApptStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_CONFIG) as ApptStatus[]).map(s => (
                  <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          <div>
            <label className="block text-sm font-medium mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Add notes…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>
        <div className="border-t px-6 py-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSave({ status, date, startTime, endTime, notes }); onClose(); }}>
            Save Changes
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}

function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (appt: MockAppointment) => void }) {
  const handleSuccess = (data: any) => {
    const id = `APT-${String(Math.floor(Math.random() * 900) + 100)}`;
    
    // We're converting from BookingFormData (serviceId, staffId, etc) to MockAppointment
    onCreate({
      id, 
      service: data.serviceId === 'srv-1' ? 'Hair Cut' : data.serviceId === 'srv-2' ? 'Hair Colouring' : 'Massage',
      customer: data.customerName, 
      customerEmail: data.customerEmail || '', 
      business: 'Style Studio', // Mock business
      staff: data.staffId === 'stf-1' ? 'Maria Garcia' : data.staffId === 'stf-2' ? 'Sam Lee' : 'John Doe',
      date: data.date, 
      startTime: data.timeSlot, 
      endTime: data.timeSlot, // Using same for mock
      status: 'PENDING',
      price: data.serviceId === 'srv-2' ? 150 : 35, 
      notes: data.notes || undefined,
    });
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-2xl bg-card rounded-xl">
        <ModalHeader title="New Appointment" subtitle="Follow the steps to book an appointment" onClose={onClose} />
        <div className="p-6">
          <MultiStepBookingForm onSuccess={handleSuccess} onCancel={onClose} />
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Shared modal primitives ─────────────────────────────────────────────────
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'hsl(0 0% 0% / 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-xl animate-in fade-in-0 zoom-in-95 bg-card rounded-xl border shadow-2xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between border-b px-6 py-4">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <button
        onClick={onClose}
        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Row action menu ──────────────────────────────────────────────────────────
function RowActions({ appt, onView, onEdit, onCancel }: {
  appt: MockAppointment;
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
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-1.5 text-sm transition-colors hover:bg-accent',
        danger && 'text-destructive hover:text-destructive'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type ModalState =
  | { type: 'none' }
  | { type: 'view';   appt: MockAppointment }
  | { type: 'edit';   appt: MockAppointment }
  | { type: 'create' };

const ALL_STATUSES: ApptStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'];

export default function AppointmentsPage() {
  const [data, setData] = useState<MockAppointment[]>(MOCK_APPOINTMENTS);
  const [search, setSearch]         = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ApptStatus>('ALL');
  const [sortKey, setSortKey]       = useState<SortKey>('date');
  const [sortDir, setSortDir]       = useState<SortDir>('desc');
  const [modal, setModal]           = useState<ModalState>({ type: 'none' });
  const [page, setPage]             = useState(1);
  const PAGE_SIZE = 8;

  // ── filter + sort ──
  const filtered = useMemo(() => {
    let rows = [...data];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.id.toLowerCase().includes(q) ||
        r.customer.toLowerCase().includes(q) ||
        r.service.toLowerCase().includes(q) ||
        r.business.toLowerCase().includes(q) ||
        r.staff.toLowerCase().includes(q)
      );
    }
    if (dateFilter) rows = rows.filter(r => r.date === dateFilter);
    if (statusFilter !== 'ALL') rows = rows.filter(r => r.status === statusFilter);

    rows.sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      const va = a[sortKey as keyof MockAppointment] as string | number;
      const vb = b[sortKey as keyof MockAppointment] as string | number;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * mul;
      return String(va).localeCompare(String(vb)) * mul;
    });
    return rows;
  }, [data, search, dateFilter, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const handleFilterChange = (fn: () => void) => { fn(); setPage(1); };

  const handleCancel = (id: string) => {
    setData(prev => prev.map(a => a.id === id ? { ...a, status: 'CANCELLED' as ApptStatus } : a));
  };

  const handleEdit = (id: string, patch: Partial<MockAppointment>) => {
    setData(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
  };

  const handleCreate = (appt: MockAppointment) => {
    setData(prev => [appt, ...prev]);
  };

  // summary counts
  const counts = useMemo(() => {
    const c: Partial<Record<ApptStatus | 'ALL', number>> = { ALL: data.length };
    ALL_STATUSES.forEach(s => { c[s] = data.filter(a => a.status === s).length; });
    return c;
  }, [data]);

  const ThCell = ({ col, label }: { col: SortKey; label: string }) => (
    <th
      className="cursor-pointer select-none px-4 py-3 text-left"
      onClick={() => handleSort(col)}
    >
      <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
        {label}
        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
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
            {data.length} total · {counts['PENDING'] ?? 0} pending · {counts['CONFIRMED'] ?? 0} confirmed
          </p>
        </div>
        <Button onClick={() => setModal({ type: 'create' })} className="gap-2">
          <Plus className="h-4 w-4" />
          New Appointment
        </Button>
      </div>

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
        {/* Toolbar */}
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center border-b py-4">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search by ID, customer, service…"
              value={search}
              onChange={e => handleFilterChange(() => setSearch(e.target.value))}
              className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Date filter */}
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={dateFilter}
                onChange={e => handleFilterChange(() => setDateFilter(e.target.value))}
                className="rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Clear filters */}
            {(search || dateFilter || statusFilter !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(''); setDateFilter(''); setStatusFilter('ALL'); setPage(1); }}
                className="gap-1.5 text-muted-foreground"
              >
                <Filter className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}

            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <ThCell col="id"       label="ID"       />
                  <ThCell col="customer" label="Customer" />
                  <ThCell col="service"  label="Service"  />
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Business & Staff</th>
                  <ThCell col="date"   label="Date / Time" />
                  <ThCell col="price"  label="Price"       />
                  <ThCell col="status" label="Status"      />
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <CalendarDays className="h-10 w-10 opacity-20" />
                        <p className="font-medium">No appointments found</p>
                        <p className="text-sm">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                ) : pageRows.map(appt => (
                  <tr key={appt.id} className="group transition-colors hover:bg-muted/20">
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="font-mono text-xs text-muted-foreground">{appt.id}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium whitespace-nowrap">{appt.customer}</p>
                      <p className="text-xs text-muted-foreground">{appt.customerEmail}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-medium">{appt.service}</td>
                    <td className="px-4 py-3.5">
                      <p className="whitespace-nowrap text-sm">{appt.business}</p>
                      <p className="text-xs text-muted-foreground">{appt.staff}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="whitespace-nowrap text-sm font-medium">
                        {new Date(appt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-muted-foreground">{appt.startTime} – {appt.endTime}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-semibold">${appt.price}</td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <StatusBadge status={appt.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <RowActions
                        appt={appt}
                        onView={() => setModal({ type: 'view', appt })}
                        onEdit={() => setModal({ type: 'edit', appt })}
                        onCancel={() => handleCancel(appt.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages} · {filtered.length} results
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      'h-8 w-8 rounded-md text-xs font-medium transition-colors',
                      p === page
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent text-muted-foreground'
                    )}
                  >
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
          onClose={() => setModal({ type: 'none' })}
          onSave={(patch) => handleEdit(modal.appt.id, patch)}
        />
      )}
      {modal.type === 'create' && (
        <CreateModal onClose={() => setModal({ type: 'none' })} onCreate={handleCreate} />
      )}
    </div>
  );
}
