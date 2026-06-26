import { useState, useMemo } from 'react';
import {
  Search, Plus, Pencil, X, ChevronUp, ChevronDown,
  ChevronsUpDown, MoreHorizontal, Trash2, Clock, DollarSign,
  Scissors, Briefcase, Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { formatCurrency } from '../utils';
import { cn } from '../lib/utils';
import { EmptyState, SkeletonCard, ApiErrorBanner } from '../components/common';
import { useServices, useCreateService, useUpdateService, useDeleteService } from '../hooks/queries';
import { useMyBusiness } from '../hooks/queries/useBusiness';
import type { Service } from '../types';

// ─── Display type (maps backend field names to UI-friendly names) ─────────────
type ServiceDisplay = {
  id: string;
  name: string;       // from serviceName
  duration: number;   // from durationMinutes
  price: number;
  description: string;
  category?: string;
};

function toDisplay(s: Service): ServiceDisplay {
  return {
    id: s.id,
    name: s.serviceName,
    duration: s.durationMinutes,
    price: parseFloat(s.price),
    description: s.description ?? '',
    category: 'General',
  };
}

const CATEGORIES = ['All', 'General', 'Hair', 'Spa', 'Nails', 'Wellness'];

// ─── Modal Primitives ─────────────────────────────────────────────────────────
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
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
type SortKey = 'name' | 'duration' | 'price' | 'category';
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
      <button
        onClick={() => setOpen(o => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-1 w-44 rounded-lg border bg-card shadow-lg py-1">
            <button onClick={() => { onEdit(); setOpen(false); }} className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-accent transition-colors">
              <Pencil className="h-3.5 w-3.5" /> Edit Details
            </button>
            <div className="my-1 border-t" />
            <button onClick={() => { onDelete(); setOpen(false); }} className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-destructive hover:bg-accent hover:text-destructive transition-colors">
              <Trash2 className="h-3.5 w-3.5" /> Delete Service
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Service Form Modal ───────────────────────────────────────────────────────
function ServiceFormModal({
  service, onClose, onSave, isSaving,
}: {
  service?: ServiceDisplay;
  onClose: () => void;
  onSave: (data: Partial<ServiceDisplay>) => void;
  isSaving?: boolean;
}) {
  const [name, setName] = useState(service?.name ?? '');
  const [duration, setDuration] = useState(service?.duration?.toString() ?? '30');
  const [price, setPrice] = useState(service?.price?.toString() ?? '0');
  const [description, setDescription] = useState(service?.description ?? '');
  const [category, setCategory] = useState(service?.category ?? 'General');
  const isEdit = !!service;
  const inputCls = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, duration: parseInt(duration) || 0, price: parseFloat(price) || 0, description, category });
  };

  return (
    <ModalOverlay onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <ModalHeader
          title={isEdit ? 'Edit Service' : 'Add New Service'}
          subtitle={isEdit ? `Updating details for ${service.name}` : 'Enter the service details below'}
          onClose={onClose}
        />
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Service Name *</label>
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Deluxe Manicure" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Duration (minutes) *</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input required type="number" min="5" step="5" value={duration} onChange={e => setDuration(e.target.value)} className={cn(inputCls, 'pl-9')} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Price (₹) *</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input required type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className={cn(inputCls, 'pl-9')} />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
              {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Describe what the service includes..." rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
            />
          </div>
        </div>
        <div className="border-t px-6 py-4 bg-muted/20 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSaving}>
            {isEdit ? (isSaving ? 'Saving…' : 'Save Changes') : (isSaving ? 'Creating…' : 'Create Service')}
          </Button>
        </div>
      </form>
    </ModalOverlay>
  );
}

function DeleteConfirmModal({
  service, onClose, onConfirm, isDeleting,
}: {
  service: ServiceDisplay;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="p-6">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 shrink-0">
            <Trash2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Delete Service</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete <strong>{service.name}</strong>? This action cannot be undone and may affect future bookings.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting…' : 'Yes, delete service'}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Category Icon Helper ─────────────────────────────────────────────────────
function getCategoryIcon(category?: string) {
  switch (category) {
    case 'Hair': return <Scissors className="h-4 w-4" />;
    case 'Spa':  return <Activity className="h-4 w-4" />;
    default:     return <Briefcase className="h-4 w-4" />;
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type ModalState =
  | { type: 'none' }
  | { type: 'edit'; service: ServiceDisplay }
  | { type: 'create' }
  | { type: 'delete'; service: ServiceDisplay };

export default function ServicesPage() {
  // API
  const { data: bizResult } = useMyBusiness();
  const businessId = bizResult?.id ?? localStorage.getItem('businessId') ?? '';
  const { data: servicesData, isLoading, isError, error, refetch } = useServices();
  const services: ServiceDisplay[] = (servicesData?.services ?? []).map(toDisplay);
  const createSvc = useCreateService();
  const updateSvc = useUpdateService();
  const deleteSvc = useDeleteService();

  // UI state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');

  const filtered = useMemo(() => {
    let rows = [...services];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
    }
    if (categoryFilter !== 'All') rows = rows.filter(r => r.category === categoryFilter);
    rows.sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      const va = a[sortKey] as string | number;
      const vb = b[sortKey] as string | number;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * mul;
      return String(va ?? '').localeCompare(String(vb ?? '')) * mul;
    });
    return rows;
  }, [services, search, categoryFilter, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleDelete = async (id: string) => {
    await deleteSvc.mutateAsync(id);
    setModal({ type: 'none' });
  };

  const handleSave = async (id: string | null, patch: Partial<ServiceDisplay>) => {
    if (!businessId) return;
    if (id) {
      await updateSvc.mutateAsync({ id, serviceName: patch.name, durationMinutes: patch.duration, price: patch.price, description: patch.description });
    } else {
      await createSvc.mutateAsync({ businessId, serviceName: patch.name!, durationMinutes: patch.duration!, price: patch.price!, description: patch.description });
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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Services Menu</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your service offerings, pricing, and durations.</p>
        </div>
        <Button onClick={() => setModal({ type: 'create' })} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" /> Add New Service
        </Button>
      </div>

      {/* Error */}
      {isError && <ApiErrorBanner error={error} retry={refetch} />}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} rows={3} />)}
        </div>
      )}

      {/* Toolbar */}
      {!isLoading && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card p-4 rounded-xl border shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text" placeholder="Search services..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategoryFilter(cat)}
                  className={cn("px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                    categoryFilter === cat ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  )}
                >{cat}</button>
              ))}
            </div>
          </div>
          <div className="flex bg-muted/50 p-1 rounded-lg border">
            <button onClick={() => setViewMode('cards')} className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-colors", viewMode === 'cards' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>Cards</button>
            <button onClick={() => setViewMode('table')} className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-colors", viewMode === 'table' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>Table</button>
          </div>
        </div>
      )}

      {/* Content */}
      {!isLoading && (
        filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16">
              <EmptyState title="No services found" description="Try adjusting your search or add a new service." />
            </CardContent>
          </Card>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(service => (
              <Card key={service.id} className="group hover:shadow-md transition-all border-border overflow-hidden flex flex-col">
                <div className="h-2 bg-primary/20" />
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="p-1.5 rounded-md bg-primary/10 text-primary">{getCategoryIcon(service.category)}</span>
                      <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">{service.category}</span>
                    </div>
                    <h3 className="font-semibold text-lg line-clamp-1">{service.name}</h3>
                  </div>
                  <RowActions onEdit={() => setModal({ type: 'edit', service })} onDelete={() => setModal({ type: 'delete', service })} />
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-6">{service.description || 'No description provided.'}</p>
                  <div className="flex items-center justify-between pt-4 border-t mt-auto">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <Clock className="h-4 w-4 text-muted-foreground" /> {service.duration} min
                    </div>
                    <div className="text-lg font-bold text-foreground">{formatCurrency(service.price)}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-border shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      <ThCell col="name" label="Service Name" />
                      <ThCell col="category" label="Category" />
                      <ThCell col="duration" label="Duration" />
                      <ThCell col="price" label="Price" />
                      <th className="w-12 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map(service => (
                      <tr key={service.id} className="group hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-4">
                          <p className="font-medium text-foreground">{service.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[300px]">{service.description}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                            {getCategoryIcon(service.category)} {service.category}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">
                          <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {service.duration} mins</span>
                        </td>
                        <td className="px-4 py-4 font-semibold text-foreground">{formatCurrency(service.price)}</td>
                        <td className="px-4 py-4">
                          <RowActions onEdit={() => setModal({ type: 'edit', service })} onDelete={() => setModal({ type: 'delete', service })} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t px-4 py-3 bg-muted/10 text-xs text-muted-foreground">
                Showing {filtered.length} of {services.length} services
              </div>
            </CardContent>
          </Card>
        )
      )}

      {/* Modals */}
      {modal.type === 'edit' && (
        <ServiceFormModal service={modal.service} onClose={() => setModal({ type: 'none' })} onSave={patch => handleSave(modal.service.id, patch)} isSaving={updateSvc.isPending} />
      )}
      {modal.type === 'create' && (
        <ServiceFormModal onClose={() => setModal({ type: 'none' })} onSave={patch => handleSave(null, patch)} isSaving={createSvc.isPending} />
      )}
      {modal.type === 'delete' && (
        <DeleteConfirmModal service={modal.service} onClose={() => setModal({ type: 'none' })} onConfirm={() => handleDelete(modal.service.id)} isDeleting={deleteSvc.isPending} />
      )}
    </div>
  );
}
