import { useState, useMemo } from 'react';
import {
  Search, Plus, Eye, Pencil, X, ChevronUp, ChevronDown,
  ChevronsUpDown, Filter, MoreHorizontal, Mail,
  Phone, Calendar, Briefcase, Trash2, ShieldCheck, UserCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import { StatusBadge, EmptyState, SkeletonTable, ApiErrorBanner } from '../components/common';
import { useStaffList, useCreateStaff, useUpdateStaff, useDeleteStaff } from '../hooks/queries';
import { useMyBusiness } from '../hooks/queries/useBusiness';
import type { Staff, AvailabilityStatus } from '../types';

// ─── Display mapping ─────────────────────────────────────────────────────────
type StaffDisplay = {
  id: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  role: string;
  status: AvailabilityStatus;
  assignedAppointments: number;
  joinDate: string;
};

function toDisplay(s: Staff): StaffDisplay {
  return {
    id: s.id,
    name: s.user?.name || 'Unknown',
    email: s.user?.email || 'N/A',
    phone: 'N/A', // Phone not in current schema
    designation: s.designation || 'Staff',
    role: s.user?.role || 'STAFF',
    status: s.availabilityStatus,
    assignedAppointments: 0, // Placeholder until appointment stats exist
    joinDate: s.createdAt,
  };
}

const STATUS_CONFIG: Record<AvailabilityStatus, { label: string; color: string }> = {
  AVAILABLE: { label: 'Available', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  UNAVAILABLE: { label: 'Unavailable', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
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
function RowActions({ onView, onEdit, onDelete }: { onView: () => void; onEdit: () => void; onDelete: () => void }) {
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
function StaffProfileModal({ staff, onClose }: { staff: StaffDisplay; onClose: () => void }) {
  const statusCfg = STATUS_CONFIG[staff.status] || STATUS_CONFIG.AVAILABLE;
  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full">
        <ModalHeader title="Staff Profile" onClose={onClose} />
        <div className="p-0">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-8 border-b">
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold shadow-inner">
                {staff.name.charAt(0).toUpperCase()}
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
              <div className="flex items-center gap-3 text-sm"><Briefcase className="h-4 w-4 text-muted-foreground" /> {staff.id.split('-')[0]}...</div>
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

function StaffFormModal({ staff, onClose, onSave, isSaving }: { staff?: StaffDisplay; onClose: () => void; onSave: (data: Partial<StaffDisplay>) => void; isSaving?: boolean }) {
  const [name, setName] = useState(staff?.name ?? '');
  const [email, setEmail] = useState(staff?.email ?? '');
  const [phone, setPhone] = useState(staff?.phone ?? '');
  const [designation, setDesignation] = useState(staff?.designation ?? '');
  const [status, setStatus] = useState<AvailabilityStatus>(staff?.status ?? 'AVAILABLE');
  const isEdit = !!staff;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, email, phone, designation, status });
  };

  const inputCls = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent";

  return (
    <ModalOverlay onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <ModalHeader title={isEdit ? 'Edit Staff Details' : 'Add New Staff'} subtitle={isEdit ? `Updating ${staff.name}` : 'Enter staff information below'} onClose={onClose} />
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* When editing an existing staff, you usually can't change their user account email via staff route */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium mb-1.5">Full Name *</label>
              <input required value={name} onChange={e => setName(e.target.value)} disabled={isEdit} placeholder="e.g. Jane Doe" className={cn(inputCls, isEdit && 'opacity-60')} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium mb-1.5">Designation *</label>
              <input required value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Senior Stylist" className={inputCls} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium mb-1.5">Email Address *</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={isEdit} placeholder="jane@example.com" className={cn(inputCls, isEdit && 'opacity-60')} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium mb-1.5">Phone Number</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} disabled={isEdit} placeholder="+1 (555) 000-0000" className={cn(inputCls, isEdit && 'opacity-60')} />
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
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Staff Member')}</Button>
        </div>
      </form>
    </ModalOverlay>
  );
}

function DeleteConfirmModal({ staff, onClose, onConfirm, isDeleting }: { staff: StaffDisplay; onClose: () => void; onConfirm: () => void; isDeleting?: boolean }) {
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
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>{isDeleting ? 'Removing...' : 'Yes, remove staff'}</Button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type ModalState = 
  | { type: 'none' }
  | { type: 'view'; staff: StaffDisplay }
  | { type: 'edit'; staff: StaffDisplay }
  | { type: 'create' }
  | { type: 'delete'; staff: StaffDisplay };

export default function StaffPage() {
  const { data: bizResult } = useMyBusiness();
  const businessId = bizResult?.id ?? localStorage.getItem('businessId') ?? '';
  
  const { data: staffData, isLoading, isError, error, refetch } = useStaffList();
  const staffMembers: StaffDisplay[] = (staffData?.staff ?? []).map(toDisplay);

  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AvailabilityStatus>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [modal, setModal] = useState<ModalState>({ type: 'none' });

  const filtered = useMemo(() => {
    let rows = [...staffMembers];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r => 
        r.name.toLowerCase().includes(q) || 
        r.designation.toLowerCase().includes(q) || 
        r.email.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'ALL') rows = rows.filter(r => r.status === statusFilter);

    rows.sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      const va = a[sortKey] as string | number;
      const vb = b[sortKey] as string | number;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * mul;
      return String(va).localeCompare(String(vb)) * mul;
    });
    return rows;
  }, [staffMembers, search, statusFilter, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleDelete = async (id: string) => {
    await deleteStaff.mutateAsync(id);
    setModal({ type: 'none' });
  };

  const handleSave = async (id: string | null, patch: Partial<StaffDisplay>) => {
    if (!businessId) return;
    if (id) {
      await updateStaff.mutateAsync({
        id,
        designation: patch.designation,
        availabilityStatus: patch.status,
      });
    } else {
      await createStaff.mutateAsync({
        businessId,
        name: patch.name!,
        email: patch.email!,
        designation: patch.designation!,
      });
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

      {isError && <ApiErrorBanner error={error} retry={refetch} />}

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
          {isLoading ? (
            <div className="p-6"><SkeletonTable cols={5} rows={5} /></div>
          ) : (
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
                            {staff.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{staff.name} {staff.role === 'BUSINESS_OWNER' && <ShieldCheck className="inline h-3.5 w-3.5 text-amber-500 ml-1" />}</p>
                            <p className="text-xs text-muted-foreground">{staff.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">{staff.designation}</td>
                      <td className="px-4 py-4">
                        {STATUS_CONFIG[staff.status] && (
                          <StatusBadge label={STATUS_CONFIG[staff.status].label} color={STATUS_CONFIG[staff.status].color} />
                        )}
                      </td>
                      <td className="px-4 py-4 font-medium text-foreground">{staff.assignedAppointments}</td>
                      <td className="px-4 py-4 text-muted-foreground">{new Date(staff.joinDate).toLocaleDateString()}</td>
                      <td className="px-4 py-4">
                        <RowActions 
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
          )}
          {!isLoading && (
            <div className="border-t px-4 py-3 bg-muted/10 text-xs text-muted-foreground flex justify-between items-center">
              <span>Showing {filtered.length} staff members</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Modals ── */}
      {modal.type === 'view' && <StaffProfileModal staff={modal.staff} onClose={() => setModal({ type: 'none' })} />}
      {modal.type === 'edit' && <StaffFormModal staff={modal.staff} onClose={() => setModal({ type: 'none' })} onSave={(patch) => handleSave(modal.staff.id, patch)} isSaving={updateStaff.isPending} />}
      {modal.type === 'create' && <StaffFormModal onClose={() => setModal({ type: 'none' })} onSave={(patch) => handleSave(null, patch)} isSaving={createStaff.isPending} />}
      {modal.type === 'delete' && <DeleteConfirmModal staff={modal.staff} onClose={() => setModal({ type: 'none' })} onConfirm={() => handleDelete(modal.staff.id)} isDeleting={deleteStaff.isPending} />}
    </div>
  );
}
