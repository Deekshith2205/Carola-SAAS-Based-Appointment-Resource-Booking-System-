import { useState, useMemo } from 'react';
import {
  Search, Plus, Eye, Pencil, X, ChevronUp, ChevronDown,
  ChevronsUpDown, Filter, Mail,
  Phone, Trash2, ShieldCheck, CheckCircle2, Scissors, Clock,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import { StatusBadge, EmptyState, SkeletonTable, ApiErrorBanner } from '../components/common';
import { useStaffList, useCreateStaff, useUpdateStaff, useDeleteStaff, useServices } from '../hooks/queries';
import { useMyBusiness } from '../hooks/queries/useBusiness';
import type { Staff, AvailabilityStatus, DayOfWeek, StaffAvailability } from '../types';

// ─── Display mapping ─────────────────────────────────────────────────────────
type StaffDisplay = {
  id: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  yearsOfExperience: number;
  bio: string;
  certifications: string[];
  specializations: string[];
  role: string;
  status: AvailabilityStatus;
  assignedAppointments: number;
  joinDate: string;
  services: { id: string; serviceName: string }[];
  availability: StaffAvailability[];
};

function toDisplay(s: Staff): StaffDisplay {
  return {
    id: s.id,
    name: s.user?.name || 'Unknown',
    email: s.user?.email || 'N/A',
    phone: s.user?.phone || '',
    designation: s.designation || '',
    department: s.department || '',
    yearsOfExperience: s.yearsOfExperience || 0,
    bio: s.bio || '',
    certifications: s.certifications || [],
    specializations: s.specializations || [],
    role: s.user?.role || 'STAFF',
    status: s.availabilityStatus,
    assignedAppointments: 0, // Placeholder
    joinDate: s.createdAt,
    services: s.services || [],
    availability: s.availability || [],
  };
}

const STATUS_CONFIG: Record<AvailabilityStatus, { label: string; color: string }> = {
  AVAILABLE: { label: 'Available', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  UNAVAILABLE: { label: 'Unavailable', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
  ON_LEAVE:  { label: 'On Leave',  color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  BUSY:      { label: 'Busy',      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  OFF_DUTY:  { label: 'Off Duty',  color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
};

const DEPARTMENTS = ['Hair', 'Skin Care', 'Makeup', 'Nails', 'Spa', 'Wellness'];
const SPECIALIZATIONS_DB = [
  'Hair Cutting', 'Hair Styling', 'Hair Coloring', 'Keratin', 
  'Facial', 'Cleanup', 'Hydra Facial', 'Bridal Makeup', 
  'Massage', 'Spa Therapy', 'Nail Art'
];
const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

// ─── Shared Modal Primitives ─────────────────────────────────────────────────
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto pt-20 pb-20" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full max-w-3xl animate-in fade-in-0 zoom-in-95 bg-card rounded-xl border shadow-2xl overflow-hidden my-auto">
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between border-b px-6 py-4 sticky top-0 bg-card z-10">
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

// ─── Modals ───────────────────────────────────────────────────────────────────

function StaffWizardModal({ staff, onClose, onSave, isSaving }: { staff?: StaffDisplay; onClose: () => void; onSave: (data: any) => void; isSaving?: boolean }) {
  const isEdit = !!staff;
  const [step, setStep] = useState(1);
  const { data: srvData } = useServices();
  const servicesList = srvData?.services ?? [];

  // Form State
  const [personal, setPersonal] = useState({
    name: staff?.name ?? '',
    email: staff?.email ?? '',
    phone: staff?.phone ?? '',
  });

  const [professional, setProfessional] = useState({
    designation: staff?.designation ?? '',
    department: staff?.department ?? '',
    yearsOfExperience: staff?.yearsOfExperience ?? 0,
    bio: staff?.bio ?? '',
    certifications: staff?.certifications?.join(', ') ?? '', // handled as comma separated for simple input
    specializations: staff?.specializations ?? [],
    availabilityStatus: staff?.status ?? 'AVAILABLE',
  });

  const [serviceIds, setServiceIds] = useState<string[]>(
    staff?.services?.map(s => s.id) ?? []
  );

  // Default Working Hours (9 to 5, Mon-Fri)
  const defaultHours = DAYS.map(d => {
    const existing = staff?.availability?.find(a => a.dayOfWeek === d);
    if (existing) {
      const getH = (iso: string) => {
        const date = new Date(iso);
        return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
      };
      return {
        dayOfWeek: d,
        isActive: existing.isActive,
        startTime: existing.startTime ? getH(existing.startTime) : '09:00',
        endTime: existing.endTime ? getH(existing.endTime) : '17:00',
        breaks: (existing.breaks ?? []).map(b => ({
          name: b.name,
          startTime: getH(b.startTime),
          endTime: getH(b.endTime),
        }))
      };
    }
    return {
      dayOfWeek: d,
      isActive: ['SAT', 'SUN'].includes(d) ? false : true,
      startTime: '09:00',
      endTime: '17:00',
      breaks: [] as any[]
    };
  });

  const [workingHours, setWorkingHours] = useState(defaultHours);

  const toggleSpecialization = (spec: string) => {
    setProfessional(prev => {
      const isSelected = prev.specializations.includes(spec);
      return {
        ...prev,
        specializations: isSelected ? prev.specializations.filter(s => s !== spec) : [...prev.specializations, spec]
      };
    });
  };

  const toggleService = (id: string) => {
    setServiceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => s - 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 6) return;
    onSave({
      name: personal.name,
      email: personal.email,
      phone: personal.phone,
      designation: professional.designation,
      department: professional.department,
      yearsOfExperience: Number(professional.yearsOfExperience),
      bio: professional.bio,
      certifications: professional.certifications.split(',').map(s => s.trim()).filter(Boolean),
      specializations: professional.specializations,
      availabilityStatus: professional.availabilityStatus,
      serviceIds: serviceIds,
      workingHours: workingHours.map(wh => ({
        ...wh,
        breaks: wh.breaks
      }))
    });
  };

  const inputCls = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent";

  return (
    <ModalOverlay onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[85vh]">
        <ModalHeader title={isEdit ? 'Edit Staff Profile' : 'Add New Staff Member'} subtitle={`Step ${step} of 6`} onClose={onClose} />
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
            {['Personal Info', 'Professional', 'Assign Services', 'Schedule', 'Breaks', 'Review'].map((label, idx) => (
              <div key={label} className="flex flex-col items-center min-w-[80px]">
                <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2", step > idx + 1 ? "bg-primary text-primary-foreground border-primary" : step === idx + 1 ? "border-primary text-primary" : "border-border text-muted-foreground")}>
                  {step > idx + 1 ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                </div>
                <span className="text-[10px] mt-1 font-medium whitespace-nowrap text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* STEP 1: Personal */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg font-semibold">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium mb-1.5">Full Name *</label>
                  <input required value={personal.name} onChange={e => setPersonal({...personal, name: e.target.value})} disabled={isEdit} placeholder="e.g. Jane Doe" className={cn(inputCls, isEdit && 'opacity-60')} />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium mb-1.5">Email Address *</label>
                  <input required type="email" value={personal.email} onChange={e => setPersonal({...personal, email: e.target.value})} disabled={isEdit} placeholder="jane@example.com" className={cn(inputCls, isEdit && 'opacity-60')} />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium mb-1.5">Phone Number</label>
                  <input value={personal.phone} onChange={e => setPersonal({...personal, phone: e.target.value})} placeholder="+1 (555) 000-0000" className={inputCls} />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium mb-1.5">Availability Status</label>
                  <select value={professional.availabilityStatus} onChange={e => setProfessional({...professional, availabilityStatus: e.target.value as AvailabilityStatus})} className={inputCls}>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Professional */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg font-semibold">Professional Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium mb-1.5">Designation / Role *</label>
                  <input required value={professional.designation} onChange={e => setProfessional({...professional, designation: e.target.value})} placeholder="e.g. Senior Stylist" className={inputCls} />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium mb-1.5">Department</label>
                  <select value={professional.department} onChange={e => setProfessional({...professional, department: e.target.value})} className={inputCls}>
                    <option value="">Select Department...</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium mb-1.5">Years of Experience</label>
                  <input type="number" min="0" value={professional.yearsOfExperience} onChange={e => setProfessional({...professional, yearsOfExperience: Number(e.target.value)})} placeholder="e.g. 5" className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Biography</label>
                  <textarea value={professional.bio} onChange={e => setProfessional({...professional, bio: e.target.value})} rows={3} placeholder="About the staff member..." className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Certifications (comma separated)</label>
                  <input value={professional.certifications} onChange={e => setProfessional({...professional, certifications: e.target.value})} placeholder="e.g. Master Colorist, Cosmetology License" className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Specializations</label>
                  <div className="flex flex-wrap gap-2 p-3 border rounded-md max-h-48 overflow-y-auto">
                    {SPECIALIZATIONS_DB.map(spec => {
                      const isActive = professional.specializations.includes(spec);
                      return (
                        <button
                          key={spec}
                          type="button"
                          onClick={() => toggleSpecialization(spec)}
                          className={cn("px-3 py-1 text-xs rounded-full border transition-all", isActive ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted")}
                        >
                          {spec}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Assign Services */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg font-semibold">Assign Services</h3>
              <p className="text-sm text-muted-foreground">Select the services this staff member is qualified to perform.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto border p-4 rounded-lg">
                {servicesList.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-2">No services available in this business.</p>
                ) : servicesList.map(s => {
                  const isChecked = serviceIds.includes(s.id);
                  return (
                    <label key={s.id} className={cn("flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors", isChecked ? "border-primary bg-primary/5" : "hover:bg-muted/50")}>
                      <input type="checkbox" checked={isChecked} onChange={() => toggleService(s.id)} className="h-4 w-4 rounded text-primary focus:ring-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{s.serviceName}</p>
                        <p className="text-xs text-muted-foreground">{s.durationMinutes} mins</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Working Schedule */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg font-semibold">Working Schedule</h3>
              <p className="text-sm text-muted-foreground">Set the weekly working hours for this staff member.</p>
              
              <div className="space-y-3">
                {workingHours.map((wh, idx) => (
                  <div key={wh.dayOfWeek} className="flex items-center gap-4 p-3 rounded-lg border bg-card">
                    <div className="w-24">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={wh.isActive} onChange={e => {
                          const newWh = [...workingHours];
                          newWh[idx].isActive = e.target.checked;
                          setWorkingHours(newWh);
                        }} className="h-4 w-4 rounded text-primary focus:ring-primary" />
                        <span className={cn("text-sm font-medium", !wh.isActive && "text-muted-foreground")}>{wh.dayOfWeek}</span>
                      </label>
                    </div>
                    {wh.isActive ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input type="time" value={wh.startTime} onChange={e => {
                          const newWh = [...workingHours];
                          newWh[idx].startTime = e.target.value;
                          setWorkingHours(newWh);
                        }} className="rounded-md border bg-background px-2 py-1 text-sm flex-1" />
                        <span className="text-muted-foreground text-xs">to</span>
                        <input type="time" value={wh.endTime} onChange={e => {
                          const newWh = [...workingHours];
                          newWh[idx].endTime = e.target.value;
                          setWorkingHours(newWh);
                        }} className="rounded-md border bg-background px-2 py-1 text-sm flex-1" />
                      </div>
                    ) : (
                      <div className="flex-1 text-sm text-muted-foreground italic">OFF</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: Break Settings */}
          {step === 5 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg font-semibold">Break Settings</h3>
              <p className="text-sm text-muted-foreground">Configure optional breaks for active working days.</p>
              
              <div className="space-y-4">
                {workingHours.filter(wh => wh.isActive).map(wh => {
                  const actualIdx = workingHours.findIndex(w => w.dayOfWeek === wh.dayOfWeek);
                  return (
                    <div key={wh.dayOfWeek} className="p-4 rounded-lg border bg-muted/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{wh.dayOfWeek}</span>
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                          const newWh = [...workingHours];
                          newWh[actualIdx].breaks.push({ name: 'Lunch', startTime: '13:00', endTime: '14:00' });
                          setWorkingHours(newWh);
                        }} className="h-7 text-xs gap-1"><Plus className="h-3 w-3" /> Add Break</Button>
                      </div>
                      
                      {wh.breaks.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No breaks scheduled.</p>
                      ) : (
                        <div className="space-y-2">
                          {wh.breaks.map((brk, bIdx) => (
                            <div key={bIdx} className="flex items-center gap-2">
                              <input type="text" value={brk.name} onChange={e => {
                                const newWh = [...workingHours];
                                newWh[actualIdx].breaks[bIdx].name = e.target.value;
                                setWorkingHours(newWh);
                              }} placeholder="Break Name" className="rounded-md border px-2 py-1 text-sm w-1/3" />
                              <input type="time" value={brk.startTime} onChange={e => {
                                const newWh = [...workingHours];
                                newWh[actualIdx].breaks[bIdx].startTime = e.target.value;
                                setWorkingHours(newWh);
                              }} className="rounded-md border px-2 py-1 text-sm flex-1" />
                              <span className="text-muted-foreground text-xs">to</span>
                              <input type="time" value={brk.endTime} onChange={e => {
                                const newWh = [...workingHours];
                                newWh[actualIdx].breaks[bIdx].endTime = e.target.value;
                                setWorkingHours(newWh);
                              }} className="rounded-md border px-2 py-1 text-sm flex-1" />
                              <button type="button" onClick={() => {
                                const newWh = [...workingHours];
                                newWh[actualIdx].breaks.splice(bIdx, 1);
                                setWorkingHours(newWh);
                              }} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 6: Review & Save */}
          {step === 6 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg font-semibold">Review & Save</h3>
              
              <div className="rounded-xl border bg-muted/10 p-5 space-y-4">
                <div className="flex items-center gap-4 border-b pb-4">
                  <div className="h-12 w-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-lg">
                    {personal.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold">{personal.name}</h4>
                    <p className="text-sm text-muted-foreground">{professional.designation} {professional.department && `· ${professional.department}`}</p>
                  </div>
                  <div className="ml-auto">
                    <StatusBadge label={STATUS_CONFIG[professional.availabilityStatus].label} color={STATUS_CONFIG[professional.availabilityStatus].color} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="block text-xs text-muted-foreground mb-1">Contact</span>
                    <div>{personal.email}</div>
                    <div>{personal.phone || 'No phone'}</div>
                  </div>
                  <div>
                    <span className="block text-xs text-muted-foreground mb-1">Experience</span>
                    <div>{professional.yearsOfExperience} years</div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <span className="block text-xs text-muted-foreground mb-2">Assigned Services ({serviceIds.length})</span>
                  <div className="flex flex-wrap gap-1.5">
                    {serviceIds.length === 0 ? <span className="text-sm italic text-muted-foreground">None</span> : 
                      serviceIds.map(id => {
                        const srv = servicesList.find(s => s.id === id);
                        return <span key={id} className="px-2 py-0.5 bg-background border rounded-md text-xs">{srv?.serviceName}</span>;
                      })
                    }
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="border-t p-6 bg-muted/20 flex items-center justify-between mt-auto">
          {step === 1 ? (
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          ) : (
            <Button type="button" variant="outline" onClick={handlePrev} disabled={isSaving} className="gap-2"><ChevronLeft className="h-4 w-4" /> Back</Button>
          )}

          {step < 6 ? (
            <Button type="button" onClick={handleNext} className="gap-2 min-w-[100px]">Next <ChevronRight className="h-4 w-4" /></Button>
          ) : (
            <Button type="submit" disabled={isSaving} className="gap-2 min-w-[120px]">
              {isSaving ? 'Saving...' : 'Save Profile'} <CheckCircle2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </ModalOverlay>
  );
}

// Staff Profile View Modal - Read Only
function StaffProfileModal({ staff, onClose }: { staff: StaffDisplay; onClose: () => void }) {
  const statusCfg = STATUS_CONFIG[staff.status] || STATUS_CONFIG.AVAILABLE;
  const [activeTab, setActiveTab] = useState<'details' | 'schedule'>('details');

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full flex flex-col max-h-[85vh]">
        <ModalHeader title="Staff Profile" onClose={onClose} />
        <div className="p-0 overflow-y-auto flex-1">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-8 border-b">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold shadow-inner">
                {staff.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold">{staff.name}</h3>
                <p className="text-muted-foreground font-medium">{staff.designation} {staff.department && `· ${staff.department}`}</p>
                <div className="mt-3 flex flex-wrap justify-center sm:justify-start items-center gap-3">
                  <StatusBadge label={statusCfg.label} color={statusCfg.color} />
                  {staff.role === 'BUSINESS_OWNER' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      <ShieldCheck className="h-3 w-3" /> Owner
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">{staff.yearsOfExperience} yrs exp.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b flex gap-6 px-6 bg-muted/10">
            <button onClick={() => setActiveTab('details')} className={cn("py-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'details' ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>Profile Details</button>
            <button onClick={() => setActiveTab('schedule')} className={cn("py-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'schedule' ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>Working Schedule</button>
          </div>

          <div className="p-6">
            {activeTab === 'details' && (
              <div className="grid sm:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground border-b pb-1">Contact Info</h4>
                    <div className="flex items-center gap-3 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /> {staff.email}</div>
                    <div className="flex items-center gap-3 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /> {staff.phone || 'N/A'}</div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground border-b pb-1">About</h4>
                    <p className="text-sm text-foreground/80 leading-relaxed">{staff.bio || 'No biography available.'}</p>
                  </div>
                  {staff.certifications.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground border-b pb-1">Certifications</h4>
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        {staff.certifications.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground border-b pb-1">Specializations</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {staff.specializations.length === 0 ? <span className="text-sm italic text-muted-foreground">None</span> : staff.specializations.map((s, i) => (
                        <span key={i} className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground border-b pb-1">Assigned Services</h4>
                    <div className="flex flex-col gap-2">
                      {staff.services.length === 0 ? <span className="text-sm italic text-muted-foreground">No services assigned.</span> : staff.services.map(s => (
                        <div key={s.id} className="flex items-center gap-2 text-sm bg-muted/30 p-2 rounded-md border border-border/50">
                          <Scissors className="h-3.5 w-3.5 text-muted-foreground" /> {s.serviceName}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className="max-w-2xl mx-auto space-y-4">
                {DAYS.map(day => {
                  const avail = staff.availability.find(a => a.dayOfWeek === day);
                  const isActive = avail?.isActive;
                  return (
                    <div key={day} className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 rounded-lg border bg-card">
                      <div className="w-24 shrink-0 pt-0.5">
                        <span className={cn("text-sm font-bold uppercase", isActive ? "text-foreground" : "text-muted-foreground")}>{day}</span>
                      </div>
                      <div className="flex-1">
                        {isActive ? (
                          <>
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Clock className="h-4 w-4 text-primary" />
                              {new Date(avail.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(avail.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {avail.breaks && avail.breaks.length > 0 && (
                              <div className="mt-3 space-y-1.5 pl-6 border-l-2 border-muted">
                                {avail.breaks.map(b => (
                                  <div key={b.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="font-medium px-1.5 py-0.5 bg-muted rounded-sm">{b.name}</span>
                                    <span>{new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">Off Duty</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="border-t px-6 py-4 bg-muted/20 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close Profile</Button>
        </div>
      </div>
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
  const [sortKey, setSortKey] = useState<'name' | 'designation' | 'status' | 'joinDate'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
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

  const handleSort = (key: 'name' | 'designation' | 'status' | 'joinDate') => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleDelete = async (id: string) => {
    await deleteStaff.mutateAsync(id);
    setModal({ type: 'none' });
  };

  const handleSave = async (id: string | null, payload: any) => {
    if (!businessId) return;
    try {
      if (id) {
        await updateStaff.mutateAsync({ id, ...payload });
      } else {
        await createStaff.mutateAsync({ businessId, ...payload });
      }
      setModal({ type: 'none' });
    } catch (e) {
      console.error(e);
      alert('Failed to save staff profile. Check console for details.');
    }
  };

  const ThCell = ({ col, label }: { col: 'name' | 'designation' | 'status' | 'joinDate'; label: string }) => (
    <th className="cursor-pointer select-none px-4 py-3 text-left group" onClick={() => handleSort(col)}>
      <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
        {label} 
        {col === sortKey ? (
          sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5 text-primary" /> : <ChevronDown className="h-3.5 w-3.5 text-primary" />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
        )}
      </span>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Staff Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage comprehensive staff profiles, working schedules, and services.</p>
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
                    <ThCell col="designation" label="Designation / Dept" />
                    <ThCell col="status" label="Status" />
                    <th className="px-4 py-3 text-left"><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Services Assigned</span></th>
                    <ThCell col="joinDate" label="Joined Date" />
                    <th className="w-12 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="py-12"><EmptyState title="No staff members found" description="Try adjusting your search or add a new staff member." /></td></tr>
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
                      <td className="px-4 py-4">
                        <p className="font-medium text-foreground">{staff.designation}</p>
                        {staff.department && <p className="text-xs text-muted-foreground">{staff.department}</p>}
                      </td>
                      <td className="px-4 py-4">
                        {STATUS_CONFIG[staff.status] && (
                          <StatusBadge label={STATUS_CONFIG[staff.status].label} color={STATUS_CONFIG[staff.status].color} />
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {staff.services.slice(0, 2).map(s => <span key={s.id} className="text-[10px] px-1.5 py-0.5 bg-muted rounded-md">{s.serviceName}</span>)}
                          {staff.services.length > 2 && <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded-md">+{staff.services.length - 2} more</span>}
                          {staff.services.length === 0 && <span className="text-xs text-muted-foreground italic">None</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">{new Date(staff.joinDate).toLocaleDateString()}</td>
                      <td className="px-4 py-4">
                        <div className="relative">
                          <button onClick={() => setModal({ type: 'view', staff })} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors mr-1 inline-flex">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button onClick={() => setModal({ type: 'edit', staff })} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors mr-1 inline-flex">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setModal({ type: 'delete', staff })} className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive hover:text-destructive transition-colors inline-flex">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
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
      {modal.type === 'edit' && <StaffWizardModal staff={modal.staff} onClose={() => setModal({ type: 'none' })} onSave={(patch) => handleSave(modal.staff.id, patch)} isSaving={updateStaff.isPending} />}
      {modal.type === 'create' && <StaffWizardModal onClose={() => setModal({ type: 'none' })} onSave={(patch) => handleSave(null, patch)} isSaving={createStaff.isPending} />}
      {modal.type === 'delete' && <DeleteConfirmModal staff={modal.staff} onClose={() => setModal({ type: 'none' })} onConfirm={() => handleDelete(modal.staff.id)} isDeleting={deleteStaff.isPending} />}
    </div>
  );
}
