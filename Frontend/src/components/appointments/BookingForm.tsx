import { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ChevronRight, ChevronLeft,
  Clock, User, CheckCircle2, Loader2, Scissors, CalendarDays
} from 'lucide-react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from '../../lib/utils';
import { useServices } from '../../hooks/queries/useServices';
import { useStaffList } from '../../hooks/queries/useStaff';
import { useResources } from '../../hooks/queries/useResources';
import { useAvailableSlots } from '../../hooks/queries/useAvailableSlots';
import { useMyBusiness } from '../../hooks/queries/useBusiness';
import { formatCurrency } from '../../utils';

// ─── Validation Schemas ───────────────────────────────────────────────────────
const serviceStepSchema = z.object({
  serviceId: z.string().min(1, 'Please select a service'),
  resourceId: z.string().optional(),
});

const timeStepSchema = z.object({
  staffId: z.string().optional(),
  date: z.string().min(1, 'Please select a date'),
  timeSlot: z.string().min(1, 'Please select a time slot'),
});

const customerStepSchema = z.object({
  customerName: z.string().min(2, 'Name must be at least 2 characters'),
  customerEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  customerPhone: z.string().optional(),
  notes: z.string().optional(),
});

const bookingSchema = serviceStepSchema.merge(timeStepSchema).merge(customerStepSchema);
type BookingFormData = z.infer<typeof bookingSchema>;

interface MultiStepBookingFormProps {
  onSuccess?: (data: BookingFormData & Record<string, unknown>) => void;
  onCancel?: () => void;
}

const STEPS = [
  { title: 'Service', icon: <Scissors className="h-4 w-4" /> },
  { title: 'Time',    icon: <Clock className="h-4 w-4" /> },
  { title: 'Details', icon: <User className="h-4 w-4" /> },
  { title: 'Confirm', icon: <CheckCircle2 className="h-4 w-4" /> },
];

export function MultiStepBookingForm({ onSuccess, onCancel }: MultiStepBookingFormProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      serviceId: '',
      resourceId: '',
      staffId: '',
      date: '',
      timeSlot: '',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      notes: '',
    },
    mode: 'onChange',
  });

  const { watch, trigger, control, register, handleSubmit, setValue, formState: { errors } } = form;
  const formData = watch();

  const { data: bizData } = useMyBusiness();
  const businessId = bizData?.id ?? localStorage.getItem('businessId') ?? '';

  const { data: srvData, isLoading: loadingSrv } = useServices();
  const { data: stfData, isLoading: loadingStf } = useStaffList();
  const { data: resData, isLoading: loadingRes } = useResources();

  const services  = srvData?.services ?? [];
  const allStaff  = stfData?.staff ?? [];
  const resources = resData?.resources ?? [];

  const selectedService = useMemo(
    () => services.find(s => s.id === formData.serviceId),
    [services, formData.serviceId]
  );

  // Filter staff to those assigned to the selected service
  const staff = useMemo(() => {
    if (!formData.serviceId) return allStaff;
    return allStaff.filter(s => s.services?.some(srv => srv.id === formData.serviceId));
  }, [allStaff, formData.serviceId]);

  const selectedStaff = useMemo(
    () => staff.find(s => s.id === formData.staffId),
    [staff, formData.staffId]
  );

  const { data: slotsData, isLoading: loadingAvail } = useAvailableSlots({
    businessId,
    serviceId: formData.serviceId,
    date: formData.date,
    staffId: formData.staffId === 'any' ? undefined : formData.staffId,
  });

  const availableSlots = slotsData || [];

  const handleNext = async () => {
    let isValid = false;
    if (step === 1) isValid = await trigger(['serviceId', 'resourceId']);
    if (step === 2) isValid = await trigger(['staffId', 'date', 'timeSlot']);
    if (step === 3) isValid = await trigger(['customerName', 'customerEmail', 'customerPhone', 'notes']);
    if (isValid) setStep(s => s + 1);
  };

  const handlePrev = () => setStep(s => s - 1);

  const onSubmit = async (data: BookingFormData) => {
    setIsSubmitting(true);
    setIsSubmitting(false);
    if (onSuccess) onSuccess({
      ...data,
      durationMinutes: selectedService?.durationMinutes ?? 30,
    });
  };

  return (
    <div className="w-full">
      {/* ── Stepper Header ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const stepNum = i + 1;
            const isActive = step === stepNum;
            const isPast   = step > stepNum;
            return (
              <div key={s.title} className="flex flex-col items-center gap-2 relative z-10 w-full">
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                  isActive ? 'border-primary bg-primary text-primary-foreground'
                           : isPast  ? 'border-primary bg-primary/10 text-primary'
                                     : 'border-muted bg-background text-muted-foreground'
                )}>
                  {isPast ? <CheckCircle2 className="h-4 w-4" /> : <span>{stepNum}</span>}
                </div>
                <span className={cn('text-xs font-medium', isActive || isPast ? 'text-foreground' : 'text-muted-foreground')}>
                  {s.title}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={cn('absolute top-4 left-[50%] right-[-50%] h-[2px] -z-10', isPast ? 'bg-primary' : 'bg-muted')} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="min-h-[300px]">

          {/* ── Step 1: Service Selection ── */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-lg font-semibold mb-1">Select Service</h3>
                <p className="text-sm text-muted-foreground mb-4">Choose the service you want to book.</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Service <span className="text-destructive">*</span></label>
                    <Controller
                      control={control}
                      name="serviceId"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={(val) => {
                            field.onChange(val);
                            const svc = services.find(s => s.id === val);
                            if (svc?.defaultResourceId) setValue('resourceId', svc.defaultResourceId);
                            // Reset staff so only qualified staff show after service changes
                            setValue('staffId', '');
                          }}
                          disabled={loadingSrv}
                        >
                          <SelectTrigger className={errors.serviceId ? 'border-destructive ring-destructive' : ''}>
                            <SelectValue placeholder={loadingSrv ? 'Loading services...' : 'Select a service'} />
                          </SelectTrigger>
                          <SelectContent>
                            {services.map(s => (
                              <SelectItem key={s.id} value={s.id}>
                                <div className="flex flex-col w-full min-w-[200px] pr-4 py-1 gap-1">
                                  <div className="flex justify-between items-center w-full">
                                    <span className="font-medium">{s.serviceName}</span>
                                    <span className="text-muted-foreground">{formatCurrency(s.price)} · {s.durationMinutes}m</span>
                                  </div>
                                  {s.description && (
                                    <span className="text-xs text-muted-foreground line-clamp-1">{s.description}</span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.serviceId && <p className="mt-1 text-xs text-destructive">{errors.serviceId.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Resource (Optional)</label>
                    <Controller
                      control={control}
                      name="resourceId"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange} disabled={loadingRes}>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingRes ? 'Loading resources...' : 'Any available resource'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any available resource</SelectItem>
                            {resources.map(r => (
                              <SelectItem key={r.id} value={r.id}>{r.resourceName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Date & Time ── */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-lg font-semibold mb-1">Date &amp; Time</h3>
                <p className="text-sm text-muted-foreground mb-4">Select your preferred staff and time slot.</p>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Staff Member (Optional)</label>
                    <Controller
                      control={control}
                      name="staffId"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange} disabled={loadingStf}>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingStf ? 'Loading staff...' : 'Anyone available'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Anyone available</SelectItem>
                            {staff.map(s => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.user?.name} <span className="text-xs text-muted-foreground ml-2">({s.designation ?? s.user?.role})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Date <span className="text-destructive">*</span></label>
                    <input
                      type="date"
                      {...register('date')}
                      min={new Date().toISOString().split('T')[0]}
                      className={cn(
                        'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                        errors.date ? 'border-destructive ring-destructive' : 'border-input'
                      )}
                    />
                    {errors.date && <p className="mt-1 text-xs text-destructive">{errors.date.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Time Slot <span className="text-destructive">*</span></label>
                    {loadingAvail ? (
                      <p className="text-sm text-muted-foreground">Loading slots...</p>
                    ) : availableSlots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {formData.date && formData.serviceId
                          ? 'No slots available for this selection.'
                          : 'Select a service and date to see available slots.'}
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {availableSlots.map(time => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => setValue('timeSlot', time, { shouldValidate: true })}
                            className={cn(
                              'rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:border-primary hover:bg-primary/5',
                              formData.timeSlot === time
                                ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
                                : 'border-input bg-background text-foreground'
                            )}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    )}
                    {errors.timeSlot && <p className="mt-1 text-xs text-destructive">{errors.timeSlot.message}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Customer Details ── */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-lg font-semibold mb-1">Customer Details</h3>
                <p className="text-sm text-muted-foreground mb-4">Enter the customer's contact information.</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Full Name <span className="text-destructive">*</span></label>
                    <input
                      {...register('customerName')}
                      placeholder="e.g. Jane Doe"
                      className={cn(
                        'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                        errors.customerName ? 'border-destructive ring-destructive' : 'border-input'
                      )}
                    />
                    {errors.customerName && <p className="mt-1 text-xs text-destructive">{errors.customerName.message}</p>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Email Address</label>
                      <input
                        type="email"
                        {...register('customerEmail')}
                        placeholder="jane@example.com"
                        className={cn(
                          'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                          errors.customerEmail ? 'border-destructive ring-destructive' : 'border-input'
                        )}
                      />
                      {errors.customerEmail && <p className="mt-1 text-xs text-destructive">{errors.customerEmail.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Phone Number</label>
                      <input
                        {...register('customerPhone')}
                        placeholder="+1 (555) 000-0000"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Notes or Special Requests</label>
                    <textarea
                      {...register('notes')}
                      rows={3}
                      placeholder="Any allergies, preferences, etc."
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Review & Confirm ── */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-lg font-semibold mb-1">Review &amp; Confirm</h3>
                <p className="text-sm text-muted-foreground mb-4">Please review the appointment details below.</p>

                <div className="rounded-xl border bg-muted/30 p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg">
                      <Scissors className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Service</p>
                      <p className="font-medium text-base">{selectedService?.serviceName}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {formatCurrency(selectedService?.price ?? 0)} · {selectedService?.durationMinutes} mins
                      </p>
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 text-primary rounded-lg">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Date &amp; Time</p>
                        <p className="font-medium">{formData.date}</p>
                        <p className="text-sm text-muted-foreground">{formData.timeSlot}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 text-primary rounded-lg">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Staff &amp; Customer</p>
                        <p className="font-medium">{formData.customerName}</p>
                        <p className="text-sm text-muted-foreground">
                          with {selectedStaff?.user?.name ?? 'Any available staff'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {formData.notes && (
                    <>
                      <div className="h-px bg-border" />
                      <div>
                        <p className="text-sm text-muted-foreground">Notes</p>
                        <p className="text-sm italic mt-1 text-foreground/80">"{formData.notes}"</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── Navigation Footer ── */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t">
          {step === 1 ? (
            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
          ) : (
            <Button type="button" variant="outline" onClick={handlePrev}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}

          {step < 4 ? (
            <Button type="button" onClick={handleNext} className="min-w-[100px]">
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Confirming...</>
              ) : (
                <>Confirm Booking <CheckCircle2 className="h-4 w-4 ml-2" /></>
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
