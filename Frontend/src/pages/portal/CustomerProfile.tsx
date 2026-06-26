import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  User, Mail, CheckCircle2,
  Bell, Shield, Camera, Eye, EyeOff, Lock,
  KeyRound, Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useUpdateProfile, useChangePassword } from '../../hooks/queries/useAuth';

// ─── Shared input style ────────────────────────────────────────────────────────
const inputCls = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all';

// ─── Notification toggle ───────────────────────────────────────────────────────
function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: () => void; label: string; description?: string;
}) {
  return (
    <div className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-muted/40 transition-colors gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={onChange}
        className={cn('relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors mt-0.5', checked ? 'bg-primary' : 'bg-muted')}
      >
        <span className={cn('inline-block h-4 w-4 rounded-full bg-background shadow-sm transition-transform', checked ? 'translate-x-4' : 'translate-x-0')} />
      </button>
    </div>
  );
}

// ─── Password strength meter ───────────────────────────────────────────────────
function StrengthMeter({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const colours = ['bg-muted', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-600'];
  const labels  = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  if (!password) return null;

  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex gap-1">
        {[1,2,3,4].map(i => (
          <div key={i} className={cn('h-1 flex-1 rounded-full transition-all', i <= score ? colours[score] : 'bg-muted')} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{labels[score] && `Strength: ${labels[score]}`}</p>
    </div>
  );
}

// ─── Zod schemas ───────────────────────────────────────────────────────────────
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

// ─── Password Tab ──────────────────────────────────────────────────────────────
function PasswordTab() {
  const changePassword = useChangePassword();
  const [status, setStatus] = useState<'idle' | 'success'>('idle');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const newPwd = watch('newPassword');

  const onSubmit = async (values: ChangePasswordValues) => {
    setStatus('idle');
    try {
      await changePassword.mutateAsync(values);
      setStatus('success');
      reset();
      setTimeout(() => setStatus('idle'), 4000);
    } catch {
      // Error rendered from changePassword.error below
    }
  };

  const serverError = changePassword.error
    ? ((changePassword.error as any)?.response?.data?.message || 'Failed to change password. Please try again.')
    : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Change Password
          </CardTitle>
          <CardDescription>Update your account password. Choose a strong password.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Success banner */}
          {status === 'success' && (
            <div className="flex items-center gap-2 rounded-md bg-emerald-50 text-emerald-600 text-sm font-medium p-3 border border-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Password changed successfully.
            </div>
          )}

          {/* Server error banner */}
          {serverError && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 text-destructive text-sm font-medium p-3 border border-destructive/20">
              <span className="shrink-0 mt-0.5">⚠️</span>
              {serverError}
            </div>
          )}

          {/* Current password */}
          <div className="space-y-1.5 max-w-sm">
            <label className="text-sm font-medium">Current Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                {...register('currentPassword')}
                type={showCurrent ? 'text' : 'password'}
                placeholder="Enter current password"
                autoComplete="current-password"
                className={cn(inputCls, 'pl-9 pr-10', errors.currentPassword && 'border-destructive focus:ring-destructive/30')}
              />
              <button
                type="button" tabIndex={-1}
                onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none"
              >
                {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
            )}
          </div>

          <div className="border-t border-dashed my-4" />

          {/* New password */}
          <div className="space-y-1.5 max-w-sm">
            <label className="text-sm font-medium">New Password</label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                {...register('newPassword')}
                type={showNew ? 'text' : 'password'}
                placeholder="Create a new password"
                autoComplete="new-password"
                className={cn(inputCls, 'pl-9 pr-10', errors.newPassword && 'border-destructive focus:ring-destructive/30')}
              />
              <button
                type="button" tabIndex={-1}
                onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none"
              >
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <StrengthMeter password={newPwd} />
            {errors.newPassword && (
              <p className="text-xs text-destructive">{errors.newPassword.message}</p>
            )}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5 max-w-sm">
            <label className="text-sm font-medium">Confirm New Password</label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                {...register('confirmPassword')}
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repeat new password"
                autoComplete="new-password"
                className={cn(inputCls, 'pl-9 pr-10', errors.confirmPassword && 'border-destructive focus:ring-destructive/30')}
              />
              <button
                type="button" tabIndex={-1}
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none"
              >
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-md bg-muted/50 border px-3 py-2 text-xs text-muted-foreground max-w-sm">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>Password must be at least 8 characters, include one uppercase letter and one number.</span>
          </div>

          <div className="flex pt-2">
            <Button type="submit" disabled={changePassword.isPending} className="gap-2">
              {changePassword.isPending
                ? 'Updating...'
                : status === 'success'
                  ? <><CheckCircle2 className="h-4 w-4" /> Updated!</>
                  : 'Update Password'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

// ─── Tab type ─────────────────────────────────────────────────────────────────
type Tab = 'profile' | 'password' | 'notifications';

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CustomerProfile() {
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();

  const [tab, setTab] = useState<Tab>('profile');

  // Profile tab state
  const [name, setName] = useState(user?.name ?? '');
  const [profileStatus, setProfileStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [profileError, setProfileError] = useState<string | null>(null);

  // Notification tab state (local-only — no backend schema support yet)
  const [notifSaved, setNotifSaved] = useState(false);
  const [notifs, setNotifs] = useState({
    bookingConfirm: true,
    reminderDay:    true,
    reminderHour:   false,
    promotions:     false,
    sms:            false,
  });

  const toggleN = (k: keyof typeof notifs) => setNotifs(n => ({ ...n, [k]: !n[k] }));

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  const initials = name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileStatus('idle');
    try {
      await updateProfile.mutateAsync({ name: name.trim() });
      setProfileStatus('success');
      setTimeout(() => setProfileStatus('idle'), 2500);
    } catch (err: any) {
      setProfileStatus('error');
      setProfileError(err.response?.data?.message || err.message || 'Failed to update profile.');
    }
  };

  const handleNotifSave = (e: React.FormEvent) => {
    e.preventDefault();
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2500);
  };

  const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'profile',       label: 'Personal Info',   icon: <User className="h-4 w-4" /> },
    { id: 'password',      label: 'Password',        icon: <Shield className="h-4 w-4" /> },
    { id: 'notifications', label: 'Notifications',   icon: <Bell className="h-4 w-4" /> },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="pb-6 border-b">
        <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your personal details and preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* ── Sidebar / Tabs ── */}
        <div className="w-full md:w-64 shrink-0 space-y-6">
          <Card className="overflow-hidden">
            <div className="h-16 bg-muted/50 border-b" />
            <CardContent className="px-6 pb-6 text-center">
              <div className="relative inline-block -mt-10 mb-3">
                <div className="h-20 w-20 rounded-full border-4 border-background bg-primary/10 text-primary flex items-center justify-center text-xl font-bold shadow-sm">
                  {initials}
                </div>
                <button className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-background border text-muted-foreground flex items-center justify-center shadow-sm hover:text-foreground hover:bg-muted transition-colors" type="button">
                  <Camera className="h-3 w-3" />
                </button>
              </div>
              <p className="font-semibold">{name || user?.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{user?.email}</p>
            </CardContent>
          </Card>

          <div className="flex flex-col space-y-1">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors w-full text-left',
                  tab === t.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Main Content Area ── */}
        <div className="flex-1 min-w-0 w-full">
          {/* ── Personal Info ── */}
          {tab === 'profile' && (
            <form onSubmit={handleProfileSave} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card>
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" /> Personal Information
                  </CardTitle>
                  <CardDescription>Update your profile details.</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {profileError && (
                    <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3 border border-destructive/20 flex items-start gap-2">
                      <span className="shrink-0 mt-0.5">⚠️</span>
                      {profileError}
                    </div>
                  )}
                  {profileStatus === 'success' && (
                    <div className="rounded-md bg-emerald-50 text-emerald-600 text-sm font-medium p-3 border border-emerald-200 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      Profile updated successfully.
                    </div>
                  )}

                  <div className="space-y-1.5 max-w-sm">
                    <label className="text-sm font-medium">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                        minLength={2}
                        className={cn(inputCls, 'pl-9')}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 max-w-sm">
                    <label className="text-sm font-medium">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="email"
                        value={user?.email ?? ''}
                        disabled
                        className={cn(inputCls, 'pl-9 opacity-60 cursor-not-allowed bg-muted')}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Contact support to change your email.</p>
                  </div>

                  <div className="flex pt-2">
                    <Button type="submit" disabled={updateProfile.isPending} className="gap-2">
                      {updateProfile.isPending
                        ? 'Saving...'
                        : profileStatus === 'success'
                          ? <><CheckCircle2 className="h-4 w-4" /> Saved!</>
                          : 'Save Changes'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          )}

          {/* ── Password ── */}
          {tab === 'password' && <PasswordTab />}

          {/* ── Notifications ── */}
          {tab === 'notifications' && (
            <form onSubmit={handleNotifSave} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card>
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bell className="h-4 w-4" /> Notification Preferences
                  </CardTitle>
                  <CardDescription>Control which messages you receive from us.</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start gap-2 rounded-md bg-muted text-foreground text-xs font-medium p-3 border border-border">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                      Notification preferences are saved locally for now.
                    </span>
                  </div>
                  <Toggle checked={notifs.bookingConfirm} onChange={() => toggleN('bookingConfirm')} label="Booking Confirmations" description="Email when a booking is confirmed or updated." />
                  <Toggle checked={notifs.reminderDay}    onChange={() => toggleN('reminderDay')}    label="24-Hour Reminder"       description="Reminder email the day before your appointment." />
                  <Toggle checked={notifs.reminderHour}   onChange={() => toggleN('reminderHour')}   label="1-Hour Reminder"        description="A reminder 1 hour before your appointment starts." />
                  <Toggle checked={notifs.sms}            onChange={() => toggleN('sms')}            label="SMS Notifications"      description="Receive text messages instead of (or in addition to) email." />
                  <Toggle checked={notifs.promotions}     onChange={() => toggleN('promotions')}     label="Promotions & Offers"    description="Special deals, seasonal packages, and loyalty rewards." />
                  <div className="flex pt-2">
                    <Button type="submit" className="gap-2">
                      {notifSaved ? <><CheckCircle2 className="h-4 w-4" /> Saved!</> : 'Save Preferences'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
