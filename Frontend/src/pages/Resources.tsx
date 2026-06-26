import { useState, useMemo } from 'react';
import {
  Search, Plus, Pencil, X, ChevronUp, ChevronDown,
  ChevronsUpDown, MoreHorizontal, Trash2, Monitor,
  Armchair, Dumbbell, Wrench, LayoutGrid, Table,
  AlertTriangle, CheckCircle2, XCircle, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import { SkeletonCard, SkeletonTable, ApiErrorBanner } from '../components/common';
import { useResources, useCreateResource, useUpdateResource, useDeleteResource } from '../hooks/queries';
import { useMyBusiness } from '../hooks/queries/useBusiness';
import type { Resource, ResourceType, ResourceStatus } from '../types';

// ─── Display mapping ─────────────────────────────────────────────────────────
type ResourceDisplay = {
  id: string;
  name: string;
  type: ResourceType;
  status: ResourceStatus;
  utilizationPercent: number; // Placeholder
  totalBookings: number;      // Placeholder
};

function toDisplay(r: Resource): ResourceDisplay {
  return {
    id: r.id,
    name: r.resourceName,
    type: r.resourceType,
    status: r.status,
    utilizationPercent: 0,
    totalBookings: 0,
  };
}

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<ResourceStatus, { label: string; color: string; icon: React.ReactNode }> = {
  AVAILABLE:   { label: 'Available',   color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',  icon: <CheckCircle2 className="h-3 w-3" /> },
  IN_USE:      { label: 'In Use',      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',             icon: <Clock className="h-3 w-3" /> },
  MAINTENANCE: { label: 'Maintenance', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',         icon: <Wrench className="h-3 w-3" /> },
  UNAVAILABLE: { label: 'Unavailable', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',             icon: <XCircle className="h-3 w-3" /> },
};

const TYPE_CONFIG: Record<ResourceType, { label: string; icon: React.ReactNode; bg: string }> = {
  ROOM:      { label: 'Room',      icon: <Monitor className="h-4 w-4" />,  bg: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  VEHICLE:   { label: 'Vehicle',   icon: <Armchair className="h-4 w-4" />, bg: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' }, // mapped VEHICLE instead of CHAIR
  EQUIPMENT: { label: 'Equipment', icon: <Dumbbell className="h-4 w-4" />, bg: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  OTHER:     { label: 'Other',     icon: <Wrench className="h-4 w-4" />,   bg: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
};

// ─── Utilization Bar ──────────────────────────────────────────────────────────
function UtilizationBar({ percent }: { percent: number }) {
  const color = percent >= 80 ? 'bg-emerald-500' : percent >= 50 ? 'bg-blue-500' : 'bg-amber-500';
  return (
    <div className="w-full mt-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">Utilization</span>
        <span className={cn("text-xs font-semibold", percent >= 80 ? 'text-emerald-600' : percent >= 50 ? 'text-blue-600' : 'text-amber-600')}>{percent}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div className={cn("h-1.5 rounded-full transition-all", color)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

// ─── Shared Modal Primitives ─────────────────────────────────────────────────
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

// ─── Sort Helper ──────────────────────────────────────────────────────────────
type SortKey = 'name' | 'type' | 'status' | 'utilizationPercent' | 'totalBookings';
type SortDir = 'asc' | 'desc';

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
  return sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5 text-primary" /> : <ChevronDown className="h-3.5 w-3.5 text-primary" />;
}

// ─── Row Action Menu ──────────────────────────────────────────────────────────
function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
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
            <button onClick={() => { onEdit(); setOpen(false); }} className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-accent transition-colors"><Pencil className="h-3.5 w-3.5" /> Edit Resource</button>
            <div className="my-1 border-t" />
            <button onClick={() => { onDelete(); setOpen(false); }} className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-destructive hover:bg-accent hover:text-destructive transition-colors"><Trash2 className="h-3.5 w-3.5" /> Delete Resource</button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────
function ResourceFormModal({ resource, onClose, onSave, isSaving }: { resource?: ResourceDisplay; onClose: () => void; onSave: (data: Partial<ResourceDisplay>) => void; isSaving?: boolean }) {
  const [name, setName] = useState(resource?.name ?? '');
  const [type, setType] = useState<ResourceType>(resource?.type ?? 'ROOM');
  const [status, setStatus] = useState<ResourceStatus>(resource?.status ?? 'AVAILABLE');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, type, status });
  };

  const isEdit = !!resource;
  const inputCls = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent";

  return (
    <ModalOverlay onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <ModalHeader title={isEdit ? 'Edit Resource' : 'Add New Resource'} subtitle={isEdit ? `Updating ${resource.name}` : 'Enter the resource details below'} onClose={onClose} />
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Resource Name *</label>
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. VIP Massage Room" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Type</label>
              <select value={type} onChange={e => setType(e.target.value as ResourceType)} className={inputCls}>
                {(Object.keys(TYPE_CONFIG) as ResourceType[]).map(t => (
                  <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as ResourceStatus)} className={inputCls}>
                {(Object.keys(STATUS_CONFIG) as ResourceStatus[]).map(s => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="border-t px-6 py-4 bg-muted/20 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Resource')}</Button>
        </div>
      </form>
    </ModalOverlay>
  );
}

function DeleteConfirmModal({ resource, onClose, onConfirm, isDeleting }: { resource: ResourceDisplay; onClose: () => void; onConfirm: () => void; isDeleting?: boolean }) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="p-6">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Delete Resource</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete <strong>{resource.name}</strong>? This will remove it from all future bookings and cannot be undone.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Yes, delete resource'}</Button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type ModalState =
  | { type: 'none' }
  | { type: 'edit'; resource: ResourceDisplay }
  | { type: 'create' }
  | { type: 'delete'; resource: ResourceDisplay };

const ALL_STATUSES: Array<'ALL' | ResourceStatus> = ['ALL', 'AVAILABLE', 'IN_USE', 'MAINTENANCE', 'UNAVAILABLE'];

export default function ResourcesPage() {
  const { data: bizResult } = useMyBusiness();
  const businessId = bizResult?.id ?? localStorage.getItem('businessId') ?? '';

  const { data: resourcesData, isLoading, isError, error, refetch } = useResources();
  const rawResources = resourcesData?.resources ?? [];
  const resources: ResourceDisplay[] = rawResources.map(toDisplay);

  const createRes = useCreateResource();
  const updateRes = useUpdateResource();
  const deleteRes = useDeleteResource();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ResourceStatus>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const filtered = useMemo(() => {
    let rows = [...resources];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r => r.name.toLowerCase().includes(q));
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
  }, [resources, search, statusFilter, sortKey, sortDir]);

  const stats = useMemo(() => ({
    total: resources.length,
    available: resources.filter(r => r.status === 'AVAILABLE').length,
    inUse: resources.filter(r => r.status === 'IN_USE').length,
    maintenance: resources.filter(r => r.status === 'MAINTENANCE').length,
    avgUtilization: Math.round(resources.reduce((sum, r) => sum + r.utilizationPercent, 0) / (resources.length || 1)),
  }), [resources]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleDelete = async (id: string) => {
    await deleteRes.mutateAsync(id);
    setModal({ type: 'none' });
  };

  const handleSave = async (id: string | null, patch: Partial<ResourceDisplay>) => {
    if (!businessId) return;
    if (id) {
      await updateRes.mutateAsync({
        id,
        resourceName: patch.name,
        resourceType: patch.type,
        status: patch.status,
      });
    } else {
      await createRes.mutateAsync({
        businessId,
        resourceName: patch.name!,
        resourceType: patch.type!,
        status: patch.status ?? 'AVAILABLE',
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
          <h1 className="text-3xl font-bold tracking-tight">Resource Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track and manage all bookable resources across your business.</p>
        </div>
        <Button onClick={() => setModal({ type: 'create' })} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" /> Add Resource
        </Button>
      </div>

      {isError && <ApiErrorBanner error={error} retry={refetch} />}

      {/* ── Utilization Stats Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Resources', value: stats.total, color: 'border-l-primary', icon: <LayoutGrid className="h-5 w-5 text-primary" /> },
          { label: 'Available', value: stats.available, color: 'border-l-emerald-500', icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" /> },
          { label: 'In Use', value: stats.inUse, color: 'border-l-blue-500', icon: <Clock className="h-5 w-5 text-blue-500" /> },
          { label: 'Maintenance', value: stats.maintenance, color: 'border-l-amber-500', icon: <Wrench className="h-5 w-5 text-amber-500" /> },
        ].map(({ label, value, color, icon }) => (
          <Card key={label} className={cn('border-l-4 shadow-sm', color)}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <p className="text-2xl font-bold mt-0.5">{value}</p>
              </div>
              {icon}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text" placeholder="Search by name…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1.5 overflow-x-auto">
            {ALL_STATUSES.map(s => {
              const cfg = s !== 'ALL' ? STATUS_CONFIG[s] : null;
              const isActive = statusFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap border transition-all',
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                  )}
                >
                  {cfg?.icon}
                  {s === 'ALL' ? 'All' : cfg?.label}
                </button>
              );
            })}
          </div>
          <div className="flex bg-muted/50 p-1 rounded-lg border shrink-0">
            <button onClick={() => setViewMode('cards')} className={cn("p-1.5 rounded-md transition-colors", viewMode === 'cards' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode('table')} className={cn("p-1.5 rounded-md transition-colors", viewMode === 'table' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
              <Table className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content Area ── */}
      {isLoading ? (
        viewMode === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} rows={2} />)}
          </div>
        ) : (
          <SkeletonTable cols={5} rows={3} />
        )
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <Wrench className="h-10 w-10 text-muted-foreground/30" />
            <p className="font-medium">No resources found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your search or add a new resource.</p>
          </CardContent>
        </Card>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(resource => {
            const typeCfg = TYPE_CONFIG[resource.type];
            return (
              <Card key={resource.id} className="group hover:shadow-md transition-all border-border overflow-hidden flex flex-col">
                <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2.5 rounded-lg shrink-0', typeCfg.bg)}>
                      {typeCfg.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-base leading-tight">{resource.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{typeCfg.label}</p>
                    </div>
                  </div>
                  <RowActions
                    onEdit={() => setModal({ type: 'edit', resource })}
                    onDelete={() => setModal({ type: 'delete', resource })}
                  />
                </CardHeader>
                <CardContent className="flex-1 pt-2">
                  <div className="flex items-center justify-between">
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_CONFIG[resource.status].color)}>
                      {STATUS_CONFIG[resource.status].icon} {STATUS_CONFIG[resource.status].label}
                    </span>
                    <span className="text-xs text-muted-foreground">{resource.totalBookings} bookings</span>
                  </div>
                  <UtilizationBar percent={resource.utilizationPercent} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-border shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <ThCell col="name" label="Resource" />
                    <ThCell col="type" label="Type" />
                    <ThCell col="status" label="Status" />
                    <ThCell col="utilizationPercent" label="Utilization" />
                    <ThCell col="totalBookings" label="Bookings" />
                    <th className="w-12 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(resource => {
                    const typeCfg = TYPE_CONFIG[resource.type];
                    return (
                      <tr key={resource.id} className="group hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn('p-2 rounded-md shrink-0', typeCfg.bg)}>
                              {typeCfg.icon}
                            </div>
                            <div>
                              <p className="font-medium">{resource.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{resource.id.split('-')[0]}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">{typeCfg.label}</td>
                        <td className="px-4 py-4">
                          <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_CONFIG[resource.status].color)}>
                            {STATUS_CONFIG[resource.status].icon} {STATUS_CONFIG[resource.status].label}
                          </span>
                        </td>
                        <td className="px-4 py-4 min-w-[140px]">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn("h-1.5 rounded-full", resource.utilizationPercent >= 80 ? 'bg-emerald-500' : resource.utilizationPercent >= 50 ? 'bg-blue-500' : 'bg-amber-500')}
                                style={{ width: `${resource.utilizationPercent}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">{resource.utilizationPercent}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-medium">{resource.totalBookings}</td>
                        <td className="px-4 py-4">
                          <RowActions
                            onEdit={() => setModal({ type: 'edit', resource })}
                            onDelete={() => setModal({ type: 'delete', resource })}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t px-4 py-3 bg-muted/10 text-xs text-muted-foreground">
              Showing {filtered.length} of {rawResources.length} resources
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Modals ── */}
      {modal.type === 'create'  && <ResourceFormModal onClose={() => setModal({ type: 'none' })} onSave={p => handleSave(null, p)} isSaving={createRes.isPending} />}
      {modal.type === 'edit'    && <ResourceFormModal resource={modal.resource} onClose={() => setModal({ type: 'none' })} onSave={p => handleSave(modal.resource.id, p)} isSaving={updateRes.isPending} />}
      {modal.type === 'delete'  && <DeleteConfirmModal resource={modal.resource} onClose={() => setModal({ type: 'none' })} onConfirm={() => handleDelete(modal.resource.id)} isDeleting={deleteRes.isPending} />}
    </div>
  );
}
