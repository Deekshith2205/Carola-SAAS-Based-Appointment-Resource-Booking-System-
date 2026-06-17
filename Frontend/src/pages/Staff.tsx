import { useState, useMemo } from 'react';
import {
  Search, Plus, Eye, Pencil, X, ChevronUp, ChevronDown,
  ChevronsUpDown, Filter, MoreHorizontal, User, Mail, 
  Phone, Calendar, Briefcase, Trash2, ShieldCheck, UserCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import { StatusBadge, EmptyState } from '../components/common';

// ─── Types ────────────────────────────────────────────────────────────────────
type AvailabilityStatus = 'AVAILABLE' | 'ON_LEAVE' | 'BUSY';

interface MockStaff {
  id: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  role: 'STAFF' | 'BUSINESS_OWNER';
  status: AvailabilityStatus;
  assignedAppointments: number;
  joinDate: string;
  avatarUrl?: string;
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────
const MOCK_STAFF_DATA: MockStaff[] = [
  { id: 'STF-001', name: 'Maria Garcia', email: 'maria@example.com', phone: '+1 (555) 123-4567', designation: 'Senior Stylist', role: 'STAFF', status: 'AVAILABLE', assignedAppointments: 14, joinDate: '2023-01-15' },
  { id: 'STF-002', name: 'John Doe', email: 'john@example.com', phone: '+1 (555) 987-6543', designation: 'Master Barber', role: 'STAFF', status: 'ON_LEAVE', assignedAppointments: 0, joinDate: '2022-11-10' },
  { id: 'STF-003', name: 'Sam Lee', email: 'sam@example.com', phone: '+1 (555) 456-7890', designation: 'Massage Therapist', role: 'STAFF', status: 'AVAILABLE', assignedAppointments: 8, joinDate: '2024-03-22' },
  { id: 'STF-004', name: 'Anna Kim', email: 'anna@example.com', phone: '+1 (555) 222-3333', designation: 'Nail Technician', role: 'STAFF', status: 'BUSY', assignedAppointments: 21, joinDate: '2023-08-05' },
  { id: 'STF-005', name: 'Admin User', email: 'admin@example.com', phone: '+1 (555) 000-0000', designation: 'Store Manager', role: 'BUSINESS_OWNER', status: 'AVAILABLE', assignedAppointments: 2, joinDate: '2021-06-01' },
];

const STATUS_CONFIG: Record<AvailabilityStatus, { label: string; color: string }> = {
  AVAILABLE: { label: 'Available', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  ON_LEAVE:  { label: 'On Leave',  color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  BUSY:      { label: 'Busy',      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
};

// ─── Shared Modal Primitives ─────────────────────────────────────────────────
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
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
      <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Sort Helper ──────────────────────────────────────────────────────────────
type SortKey = 'name' | 'designation' | 'status' | 'assignedAppointments' | 'joinDate';
type SortDir = 'asc' | 'desc';

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
  return sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5 text-primary" /> : <ChevronDown className="h-3.5 w-3.5 text-primary" />;
}

// ─── Row Action Menu ──────────────────────────────────────────────────────────
function RowActions({ staff, onView, onEdit, onDelete }: { staff: MockStaff; onView: () => void; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-1 w-44 rounded-lg border bg-card shadow-lg py-1">
            <button onClick={() => { onView(); setOpen(false); }} className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-accent transition-colors"><Eye className="h-3.5 w-3.5" /> View Profile</button>
            <button onClick={() => { onEdit(); setOpen(false); }} className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-accent transition-colors"><Pencil className="h-3.5 w-3.5" /> Edit Details</button>
            <div className="my-1 border-t" />
            <button onClick={() => { onDelete(); setOpen(false); }} className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-destructive hover:bg-accent hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /> Remove Staff</button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────
function StaffProfileModal({ staff, onClose }: { staff: MockStaff; onClose: () => void }) {
  const statusCfg = STATUS_CONFIG[staff.status];
  
  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full">
        <ModalHeader title="Staff Profile" onClose={onClose} />
        <div className="p-0">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-8 border-b">
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold shadow-inner">
                {staff.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-2xl font-bold">{staff.name}</h3>
                <p className="text-muted-foreground font-medium">{staff.designation}</p>
                <div className="mt-2 flex items-center gap-3">
                  <StatusBadge label={statusCfg.label} color={statusCfg.color} />
                  {staff.role === 'BUSINESS_OWNER' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                      <ShieldCheck className="h-3 w-3" /> Owner
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 grid sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Contact Info</h4>
              <div className="flex items-center gap-3 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /> {staff.email}</div>
              <div className="flex items-center gap-3 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /> {staff.phone}</div>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Work Details</h4>
              <div className="flex items-center gap-3 text-sm"><Briefcase className="h-4 w-4 text-muted-foreground" /> {staff.id}</div>
              <div className="flex items-center gap-3 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" /> Joined {new Date(staff.joinDate).toLocaleDateString()}</div>
              <div className="flex items-center gap-3 text-sm"><UserCheck className="h-4 w-4 text-muted-foreground" /> {staff.assignedAppointments} Upcoming Appts.</div>
            </div>
          </div>
        </div>
        <div className="border-t px-6 py-4 bg-muted/20 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close Profile</Button>
        </div>
      </div>
    </ModalOverlay>
  );
}

function StaffFormModal({ staff, onClose, onSave }: { staff?: MockStaff; onClose: () => void; onSave: (data: Partial<MockStaff>) => void }) {
  const [name, setName] = useState(staff?.name ?? '');
  const [email, setEmail] = useState(staff?.email ?? '');
  const [phone, setPhone] = useState(staff?.phone ?? '');
  const [designation, setDesignation] = useState(staff?.designation ?? '');
  const [status, setStatus] = useState<AvailabilityStatus>(staff?.status ?? 'AVAILABLE');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, email, phone, designation, status });
    onClose();
  };

  const isEdit = !!staff;
  const inputCls = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent";

  return (
    <ModalOverlay onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <ModalHeader title={isEdit ? 'Edit Staff Details' : 'Add New Staff'} subtitle={isEdit ? `Updating ${staff.name}` : 'Enter staff information below'} onClose={onClose} />
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium mb-1.5">Full Name *</label>
              <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Jane Doe" className={inputCls} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium mb-1.5">Designation *</label>
              <input required value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Senior Stylist" className={inputCls} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium mb-1.5">Email Address *</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" className={inputCls} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium mb-1.5">Phone Number</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1.5">Availability Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as AvailabilityStatus)} className={inputCls}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="border-t px-6 py-4 bg-muted/20 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit">{isEdit ? 'Save Changes' : 'Add Staff Member'}</Button>
        </div>
      </form>
    </ModalOverlay>
  );
}

function DeleteConfirmModal({ staff, onClose, onConfirm }: { staff: MockStaff; onClose: () => void; onConfirm: () => void }) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="p-6">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 shrink-0">
            <Trash2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Remove Staff Member</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to remove <strong>{staff.name}</strong> from your business? This action cannot be undone.
              {staff.assignedAppointments > 0 && (
                <span className="block mt-2 font-medium text-amber-600">
                  Warning: They have {staff.assignedAppointments} assigned appointments that will need to be reassigned or cancelled.
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Yes, remove staff</Button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type ModalState = 
  | { type: 'none' }
  | { type: 'view'; staff: MockStaff }
  | { type: 'edit'; staff: MockStaff }
  | { type: 'create' }
  | { type: 'delete'; staff: MockStaff };

export default function StaffPage() {
  const [data, setData] = useState<MockStaff[]>(MOCK_STAFF_DATA);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AvailabilityStatus>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [modal, setModal] = useState<ModalState>({ type: 'none' });

  // ── filter + sort ──
  const filtered = useMemo(() => {
    let rows = [...data];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r => 
        r.name.toLowerCase().includes(q) || 
        r.designation.toLowerCase().includes(q) || 
        r.email.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'ALL') rows = rows.filter(r => r.status === statusFilter);

    rows.sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      const va = a[sortKey as keyof MockStaff] as string | number;
      const vb = b[sortKey as keyof MockStaff] as string | number;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * mul;
      return String(va).localeCompare(String(vb)) * mul;
    });
    return rows;
  }, [data, search, statusFilter, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleDelete = (id: string) => {
    setData(prev => prev.filter(s => s.id !== id));
    setModal({ type: 'none' });
  };

  const handleSave = (id: string | null, patch: Partial<MockStaff>) => {
    if (id) {
      setData(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
    } else {
      const newStaff: MockStaff = {
        id: `STF-00${data.length + 1}`,
        name: patch.name!, email: patch.email!, phone: patch.phone!, designation: patch.designation!,
        status: patch.status ?? 'AVAILABLE', role: 'STAFF', assignedAppointments: 0, joinDate: new Date().toISOString().split('T')[0],
      };
      setData(prev => [...prev, newStaff]);
    }
    setModal({ type: 'none' });
  };

  const ThCell = ({ col, label }: { col: SortKey; label: string }) => (
    <th className="cursor-pointer select-none px-4 py-3 text-left group" onClick={() => handleSort(col)}>
      <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
        {label} <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </span>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Staff Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your team members, availability, and roles.</p>
        </div>
        <Button onClick={() => setModal({ type: 'create' })} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" /> Add Staff Member
        </Button>
      </div>

      {/* ── Data Table Card ── */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b py-4 bg-muted/10">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input 
              type="text" placeholder="Search staff by name, email, or role…" 
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <select 
                value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
                className="rounded-md border border-input bg-background py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              >
                <option value="ALL">All Statuses</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <ThCell col="name" label="Staff Member" />
                  <ThCell col="designation" label="Designation" />
                  <ThCell col="status" label="Status" />
                  <ThCell col="assignedAppointments" label="Upcoming Appts." />
                  <ThCell col="joinDate" label="Joined Date" />
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-12"><EmptyState title="No staff members found" description="Try adjusting your search or filters." /></td></tr>
                ) : filtered.map(staff => (
                  <tr key={staff.id} className="group hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {staff.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{staff.name} {staff.role === 'BUSINESS_OWNER' && <ShieldCheck className="inline h-3.5 w-3.5 text-amber-500 ml-1" />}</p>
                          <p className="text-xs text-muted-foreground">{staff.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">{staff.designation}</td>
                    <td className="px-4 py-4">
                      <StatusBadge label={STATUS_CONFIG[staff.status].label} color={STATUS_CONFIG[staff.status].color} />
                    </td>
                    <td className="px-4 py-4 font-medium text-foreground">{staff.assignedAppointments}</td>
                    <td className="px-4 py-4 text-muted-foreground">{new Date(staff.joinDate).toLocaleDateString()}</td>
                    <td className="px-4 py-4">
                      <RowActions 
                        staff={staff} 
                        onView={() => setModal({ type: 'view', staff })}
                        onEdit={() => setModal({ type: 'edit', staff })}
                        onDelete={() => setModal({ type: 'delete', staff })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t px-4 py-3 bg-muted/10 text-xs text-muted-foreground flex justify-between items-center">
            <span>Showing {filtered.length} staff members</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Modals ── */}
      {modal.type === 'view' && <StaffProfileModal staff={modal.staff} onClose={() => setModal({ type: 'none' })} />}
      {modal.type === 'edit' && <StaffFormModal staff={modal.staff} onClose={() => setModal({ type: 'none' })} onSave={(patch) => handleSave(modal.staff.id, patch)} />}
      {modal.type === 'create' && <StaffFormModal onClose={() => setModal({ type: 'none' })} onSave={(patch) => handleSave(null, patch)} />}
      {modal.type === 'delete' && <DeleteConfirmModal staff={modal.staff} onClose={() => setModal({ type: 'none' })} onConfirm={() => handleDelete(modal.staff.id)} />}
    </div>
  );
}
