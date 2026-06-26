import { useState, useMemo } from 'react';
import {
  Clock, CheckCircle2,
  ChevronRight, ChevronLeft, User,
  Sparkles, Mail, Phone, MessageSquare, Scissors, ShieldCheck
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useServices } from '../../hooks/queries/useServices';
import { useStaffList } from '../../hooks/queries/useStaff';
import { useAvailableSlots } from '../../hooks/queries/useAvailableSlots';
import { useCreateAppointment } from '../../hooks/queries/useAppointments';
import { useMyBusiness } from '../../hooks/queries/useBusiness';
import { formatCurrency } from '../../utils';

// ─── Constants ─────────────────────────────────────────────────────────────────
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const STEP_LABELS = ['Service', 'Staff', 'Date & Time', 'Your Details', 'Confirm'];

const inputCls = 'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all';

function getWeekDays(base: Date) {
  const days: Date[] = [];
  const start = new Date(base);
  start.setDate(base.getDate() - base.getDay() + 1);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-6 overflow-x-auto">
      {STEP_LABELS.map((label, i) => (
        <div key={label} className="flex items-center shrink-0">
          <div className="flex flex-col items-center">
            <div className={cn(
              'h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all',
              i < current   ? 'bg-primary border-primary text-primary-foreground'
              : i === current ? 'border-primary text-primary bg-primary/5'
              : 'border-border text-muted-foreground bg-background'
            )}>
              {i < current ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={cn(
              'text-[10px] font-medium mt-1 whitespace-nowrap',
              i === current ? 'text-primary' : 'text-muted-foreground'
            )}>
              {label}
            </span>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div className={cn('w-8 sm:w-12 h-px mx-1 mb-4 transition-colors', i < current ? 'bg-primary' : 'bg-border')} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CustomerBooking() {
  const { user } = useAuth();
  const { data: business, isLoading: loadingBusiness } = useMyBusiness();
  const businessId = business?.id;

  const { data: srvData, isLoading: loadingSrv } = useServices();
  const { data: stfData, isLoading: loadingStf }  = useStaffList();
  const createReq = useCreateAppointment();

  const services = srvData?.services ?? [];
  const staff    = stfData?.staff    ?? [];

  const [step, setStep]                 = useState(0);
  const [selectedService, setSelectedService] = useState<typeof services[0] | null>(null);
  const [selectedStaff, setSelectedStaff]     = useState<typeof staff[0] | null>(null);

  // Filter staff based on the selected service
  const filteredStaff = useMemo(() => {
    if (!selectedService) return staff;
    return staff.filter(s => s.services?.some(srv => srv.id === selectedService.id));
  }, [staff, selectedService]);

  const [weekBase, setWeekBase]         = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [booked, setBooked]             = useState(false);
  const [apiError, setApiError]         = useState<string | null>(null);
  const [notes, setNotes]               = useState('');

  const [details, setDetails] = useState({
    name: user?.name ?? '', email: user?.email ?? '',
    phone: '', gender: '', dob: '', allergies: '', firstVisit: false,
  });
  const setDetail = (k: string, v: string | boolean) => setDetails(d => ({ ...d, [k]: v }));

  const weekDays = getWeekDays(weekBase);
  const today    = new Date(); today.setHours(0, 0, 0, 0);

  // Fetch available slots dynamically from the backend
  const { data: slotsData, isLoading: loadingAvail } = useAvailableSlots({
    businessId: businessId || '',
    serviceId: selectedService?.id || '',
    date: selectedDate ? new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0] : '',
    staffId: selectedStaff?.id,
  });

  const availableSlots = slotsData || [];

  const canNext = [
    !!selectedService, true, !!selectedDate && !!selectedTime,
    !!details.name && !!details.email && !!details.phone, true,
  ][step];

  const handleConfirm = async () => {
    if (!businessId || !selectedService || !selectedDate || !selectedTime) return;
    setApiError(null);
    try {
      const durationMinutes = selectedService.durationMinutes || 30;
      const [startH, startM] = selectedTime.split(':').map(Number);
      const endTotalMinutes = startH * 60 + startM + durationMinutes;
      const endTime = `${String(Math.floor(endTotalMinutes / 60) % 24).padStart(2, '0')}:${String(endTotalMinutes % 60).padStart(2, '0')}`;
      
      const dateString = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];

      await createReq.mutateAsync({
        businessId,
        serviceId: selectedService.id,
        staffId: selectedStaff?.id || undefined,
        resourceId: selectedService.defaultResourceId || undefined,
        appointmentDate: dateString,
        startTime: selectedTime,
        endTime,
      });
      setBooked(true);
    } catch (e: any) {
      console.error(e);
      let errMsg = e.response?.data?.message || e.message || 'Failed to create appointment. There may be a scheduling conflict.';
      const errs = e.response?.data?.errors;
      if (errs) {
        if (Array.isArray(errs)) {
          errMsg = `${errMsg}: ${errs.join(' | ')}`;
        } else if (typeof errs === 'object') {
          const fieldMsgs = Object.entries(errs)
            .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
            .join(' | ');
          errMsg = `${errMsg}: ${fieldMsgs}`;
        }
      }
      setApiError(errMsg);
    }
  };

  const handleReset = () => {
    setBooked(false); setStep(0); setApiError(null);
    setSelectedService(null); setSelectedStaff(null);
    setSelectedDate(null); setSelectedTime(null); setNotes('');
  };

  if (loadingBusiness) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
        <p className="text-sm text-muted-foreground">Loading portal...</p>
      </div>
    );
  }

  if (!businessId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
        <div className="h-12 w-12 rounded-xl border bg-muted flex items-center justify-center">
          <Scissors className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold">No Business Found</p>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">We couldn't locate the booking service. Please try again later.</p>
        </div>
      </div>
    );
  }

  if (booked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-5 py-12">
        <div className="h-16 w-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Booking Confirmed</h2>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
            A confirmation has been sent to <strong>{details.email}</strong>. Your <strong>{selectedService?.serviceName}</strong> is scheduled for <strong>{selectedDate?.toDateString()}</strong> at <strong>{selectedTime}</strong>.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>Book Another</Button>
          <Button size="sm" onClick={() => window.location.href = '/portal/appointments'}>View Appointments</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-6 border-b">
        <h1 className="text-2xl font-semibold tracking-tight">Book an Appointment</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Choose your service, staff, and preferred time.</p>
      </div>

      <StepIndicator current={step} />

      {/* ─── Step 0 : Service ─────────────────────────────────────────── */}
      {step === 0 && (
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base">Choose a Service</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {loadingSrv ? (
              <p className="text-sm text-muted-foreground">Loading services…</p>
            ) : services.length === 0 ? (
              <p className="text-sm text-muted-foreground">No services available.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {services.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedService(s)}
                    className={cn(
                      'text-left p-4 rounded-lg border transition-all hover:shadow-sm',
                      selectedService?.id === s.id
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-background hover:border-primary/40'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg border bg-muted flex items-center justify-center shrink-0">
                        <Scissors className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{s.serviceName}</p>
                        {s.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{s.description}</p>}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.durationMinutes} min</span>
                          <span className="font-medium text-foreground">{formatCurrency(s.price)}</span>
                        </div>
                      </div>
                      {selectedService?.id === s.id && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Step 1 : Staff ───────────────────────────────────────────── */}
      {step === 1 && (
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base">Choose Your Stylist <span className="text-sm font-normal text-muted-foreground">(Optional)</span></CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {loadingStf ? (
              <p className="text-sm text-muted-foreground">Loading staff…</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedStaff(null)}
                  className={cn(
                    'p-4 rounded-lg border transition-all hover:shadow-sm text-center flex flex-col items-center gap-2',
                    selectedStaff === null
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/40'
                  )}
                >
                  <div className="h-12 w-12 rounded-full border bg-muted flex items-center justify-center">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Anyone</p>
                    <p className="text-xs text-muted-foreground">First available</p>
                  </div>
                  {selectedStaff === null && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </button>

                {filteredStaff.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStaff(s)}
                    className={cn(
                      'p-4 rounded-lg border transition-all hover:shadow-sm text-center flex flex-col items-center gap-2',
                      selectedStaff?.id === s.id
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/40'
                    )}
                  >
                    <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-base font-bold">
                      {s.user?.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{s.user?.name} {s.user?.role === 'BUSINESS_OWNER' && <ShieldCheck className="inline h-3.5 w-3.5 text-amber-500 ml-0.5" />}</p>
                      <p className="text-xs text-muted-foreground">{s.user?.role}</p>
                    </div>
                    {selectedStaff?.id === s.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Step 2 : Date & Time ─────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Pick a Date</CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => { const d = new Date(weekBase); d.setDate(d.getDate()-7); setWeekBase(d); }}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-xs text-muted-foreground px-2 whitespace-nowrap">
                    {weekDays[0].toLocaleDateString('en-US',{month:'short',day:'numeric'})} – {weekDays[6].toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                  </span>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => { const d = new Date(weekBase); d.setDate(d.getDate()+7); setWeekBase(d); }}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day, i) => {
                  const isPast      = day < today;
                  const isSelected  = selectedDate?.toDateString() === day.toDateString();
                  return (
                    <button
                      key={i}
                      disabled={isPast}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        'flex flex-col items-center py-2.5 rounded-lg text-xs font-medium transition-all',
                        isPast      ? 'opacity-30 cursor-not-allowed' :
                        isSelected  ? 'bg-primary text-primary-foreground shadow-sm' :
                                      'hover:bg-muted border border-transparent hover:border-border cursor-pointer'
                      )}
                    >
                      <span className="text-[9px] uppercase tracking-wide opacity-70">{DAY_LABELS[i]}</span>
                      <span className="text-sm font-bold mt-0.5">{day.getDate()}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {selectedDate && (
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base">
                  Available Times · {selectedDate.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {loadingAvail ? (
                  <p className="text-sm text-muted-foreground">Loading slots…</p>
                ) : availableSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No slots available for this date.</p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {availableSlots.map(t => (
                      <button
                        key={t}
                        onClick={() => setSelectedTime(t)}
                        className={cn(
                          'py-2 px-1 rounded-lg text-xs font-medium border transition-all',
                          selectedTime === t
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border hover:border-primary/50 hover:bg-primary/5'
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ─── Step 3 : Customer Details ────────────────────────────────── */}
      {step === 3 && (
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base">Your Details</CardTitle>
            <p className="text-xs text-muted-foreground">Help us personalise your experience.</p>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Full Name <span className="text-destructive">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input value={details.name} onChange={e => setDetail('name', e.target.value)} placeholder="Jane Smith" className={cn(inputCls, 'pl-9')} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email <span className="text-destructive">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input type="email" value={details.email} onChange={e => setDetail('email', e.target.value)} placeholder="jane@example.com" className={cn(inputCls, 'pl-9')} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Phone <span className="text-destructive">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input value={details.phone} onChange={e => setDetail('phone', e.target.value)} placeholder="+91 98765 43210" className={cn(inputCls, 'pl-9')} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Gender</label>
                <select value={details.gender} onChange={e => setDetail('gender', e.target.value)} className={inputCls}>
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Date of Birth</label>
              <input type="date" value={details.dob} onChange={e => setDetail('dob', e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" /> Allergies / Sensitivities
              </label>
              <textarea
                value={details.allergies}
                onChange={e => setDetail('allergies', e.target.value)}
                placeholder="e.g. latex, certain dyes, fragrances…"
                rows={2}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border hover:bg-muted/40 transition-colors">
              <input
                type="checkbox"
                checked={details.firstVisit}
                onChange={e => setDetail('firstVisit', e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary"
              />
              <div>
                <p className="text-sm font-medium">This is my first visit</p>
                <p className="text-xs text-muted-foreground">We'll schedule a short consultation before your session.</p>
              </div>
            </label>
          </CardContent>
        </Card>
      )}

      {/* ─── Step 4 : Confirm ─────────────────────────────────────────── */}
      {step === 4 && (
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base">Review & Confirm</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-5">
            {apiError && (
              <div className="rounded-lg bg-destructive/10 text-destructive text-sm p-3 border border-destructive/20">
                ⚠️ {apiError}
              </div>
            )}

            {/* Service summary */}
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="h-10 w-10 rounded-lg border bg-muted flex items-center justify-center shrink-0">
                <Scissors className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">{selectedService?.serviceName}</p>
                <p className="text-sm text-muted-foreground">{selectedService?.durationMinutes} min · {formatCurrency(selectedService?.price ?? 0)}</p>
              </div>
            </div>

            {/* Detail grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Stylist</p>
                <p className="font-medium">{selectedStaff?.user?.name ?? 'First available'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Date & Time</p>
                <p className="font-medium">{selectedDate?.toDateString()}</p>
                <p className="text-xs text-muted-foreground">{selectedTime}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Customer</p>
                <p className="font-medium">{details.name}</p>
                <p className="text-xs text-muted-foreground">{details.phone}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Confirmation to</p>
                <p className="font-medium truncate">{details.email}</p>
                {details.firstVisit && <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full ring-1 ring-amber-200 font-medium">First Visit</span>}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5 border-t pt-4">
              <label className="text-sm font-medium">Additional Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any special requests…"
                rows={2}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            {/* Total */}
            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <p className="text-xs text-muted-foreground">Total due at appointment</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(selectedService?.price ?? 0)}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>Free cancellation</p>
                <p>Up to 24h before</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0 || createReq.isPending} className="gap-2">
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        {step < 4 ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canNext} className="gap-2">
            Continue <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleConfirm} disabled={createReq.isPending} className="gap-2">
            <Sparkles className="h-4 w-4" /> {createReq.isPending ? 'Confirming…' : 'Confirm Booking'}
          </Button>
        )}
      </div>
    </div>
  );
}
