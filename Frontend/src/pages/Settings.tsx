import { useState, useEffect } from 'react';
import {
  Building2, Bell, User, Mail,
  Phone, CheckCircle2, Save, Key,
  Smartphone, Monitor, Eye, EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useMyBusiness, useUpdateBusiness } from '../hooks/queries/useBusiness';
import { useUpdateProfile } from '../hooks/queries/useAuth';

// ─── Types ────────────────────────────────────────────────────────────────────
type SettingsTab = 'business' | 'profile' | 'security' | 'notifications';

// ─── Shared Components ────────────────────────────────────────────────────────
const inputCls = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all";

function FieldGroup({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-5 border-b last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>}
      </div>
      <div className="sm:col-span-2 space-y-3">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn('relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors', checked ? 'bg-primary' : 'bg-muted')}
      >
        <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform', checked ? 'translate-x-4' : 'translate-x-0')} />
      </button>
    </div>
  );
}

function SaveButton({ saved }: { saved: boolean }) {
  return (
    <Button type="submit" className="gap-2 min-w-[140px]">
      {saved ? <><CheckCircle2 className="h-4 w-4" /> Saved!</> : <><Save className="h-4 w-4" /> Save Changes</>}
    </Button>
  );
}

// ─── Tab Components ───────────────────────────────────────────────────────────

function BusinessSettings() {
  const { data: business, isLoading } = useMyBusiness();
  const updateReq = useUpdateBusiness();
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    businessName: '',
    phone: '',
    email: '',
    address: '',
  });

  // Sync form when data loads
  useEffect(() => {
    if (business) {
      setForm({
        businessName: business.businessName ?? '',
        phone: business.phone ?? '',
        email: business.email ?? '',
        address: business.address ?? '',
      });
    }
  }, [business]);

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    try {
      await updateReq.mutateAsync({
        id: business.id,
        businessName: form.businessName,
        phone: form.phone,
        email: form.email,
        address: form.address,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading business details...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>Manage your business profile visible to customers.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <FieldGroup label="Business Name" description="This appears across the platform and on invoices.">
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={form.businessName} onChange={e => set('businessName', e.target.value)} className={cn(inputCls, 'pl-9')} />
            </div>
          </FieldGroup>

          <FieldGroup label="Contact Details" description="Used for customer communication and support.">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="Email" className={cn(inputCls, 'pl-9')} />
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Phone" className={cn(inputCls, 'pl-9')} />
            </div>
          </FieldGroup>

          <FieldGroup label="Address" description="Your physical business location for appointments.">
            <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St, City" className={inputCls} />
          </FieldGroup>

          <div className="pt-5 flex justify-end">
            <Button type="submit" disabled={updateReq.isPending} className="gap-2 min-w-[140px]">
              {updateReq.isPending ? 'Saving...' : saved ? <><CheckCircle2 className="h-4 w-4" /> Saved!</> : <><Save className="h-4 w-4" /> Save Changes</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

function ProfileSettings() {
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const [name, setName] = useState(user?.name ?? '');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [apiError, setApiError] = useState<string | null>(null);

  // Sync local state when user data changes (e.g. on initial load)
  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setSaveStatus('idle');
    try {
      await updateProfile.mutateAsync({ name: name.trim() });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err: any) {
      setSaveStatus('error');
      setApiError(err.response?.data?.message || err.message || 'Failed to update profile.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>Update your personal account information.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {apiError && (
            <div className="rounded-lg bg-destructive/15 text-destructive text-sm font-medium p-3 border border-destructive/20 flex items-start gap-2 mb-4">
              <span className="shrink-0 mt-0.5">⚠️</span>
              {apiError}
            </div>
          )}
          {saveStatus === 'success' && (
            <div className="rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-sm font-medium p-3 border border-emerald-500/20 flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Profile updated successfully.
            </div>
          )}

          <FieldGroup label="Avatar" description="Your profile photo used internally.">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold shadow-inner">
                {name.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="space-y-2">
                <Button type="button" variant="outline" size="sm" disabled>Upload new photo</Button>
                <p className="text-[11px] text-muted-foreground">JPG, GIF or PNG. Max size of 800K</p>
              </div>
            </div>
          </FieldGroup>

          <FieldGroup label="Full Name" description="Your display name across the platform.">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Full Name"
                required
                minLength={2}
                className={cn(inputCls, 'pl-9')}
              />
            </div>
          </FieldGroup>

          <FieldGroup label="Email Address" description="Email cannot be changed here.">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={user?.email ?? ''}
                disabled
                className={cn(inputCls, 'pl-9 opacity-60 cursor-not-allowed')}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Contact support to change your email.</p>
          </FieldGroup>

          <div className="pt-5 flex justify-end">
            <Button type="submit" disabled={updateProfile.isPending} className="gap-2 min-w-[140px]">
              {updateProfile.isPending
                ? 'Saving...'
                : saveStatus === 'success'
                  ? <><CheckCircle2 className="h-4 w-4" /> Saved!</>
                  : <><Save className="h-4 w-4" /> Save Changes</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

function PasswordSettings() {
  const [saved, setSaved] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Password Change</CardTitle>
            <CardDescription>Update your password associated with your account.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <FieldGroup label="Current Password" description="You must provide your current password to change it.">
              <div className="relative">
                <input type={showCurrent ? "text" : "password"} placeholder="Enter current password" className={cn(inputCls, "pr-10")} />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FieldGroup>

            <FieldGroup label="New Password" description="Must be at least 8 characters long.">
              <div className="relative mb-3">
                <input type={showNew ? "text" : "password"} placeholder="Enter new password" className={cn(inputCls, "pr-10")} />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="relative">
                <input type={showConfirm ? "text" : "password"} placeholder="Confirm new password" className={cn(inputCls, "pr-10")} />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FieldGroup>

            <div className="pt-5 flex justify-end">
              <SaveButton saved={saved} />
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Manage devices that are currently logged in to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-4">
                <Monitor className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium flex items-center gap-2">
                    Windows PC · Chrome <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold px-2 py-0.5 rounded-full">CURRENT</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">New York, USA · Active now</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-4">
                <Smartphone className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">iPhone 13 Pro · Safari</p>
                  <p className="text-xs text-muted-foreground mt-0.5">New York, USA · Last active 2h ago</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="text-destructive">Revoke</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationSettings() {
  const [saved, setSaved] = useState(false);
  const [notifs, setNotifs] = useState({
    newBooking: true, cancellation: true, staffAssigned: true,
    reminder24h: true, reminder1h: false, weeklyReport: false,
  });

  const toggle = (key: keyof typeof notifs) => setNotifs(n => ({ ...n, [key]: !n[key] }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <form onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Control which alerts and reminders you receive via email.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <FieldGroup label="Booking Events" description="Alerts triggered by customer activity.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Toggle checked={notifs.newBooking} onChange={() => toggle('newBooking')} label="New booking created" />
              <Toggle checked={notifs.cancellation} onChange={() => toggle('cancellation')} label="Appointment cancelled" />
              <Toggle checked={notifs.staffAssigned} onChange={() => toggle('staffAssigned')} label="Staff assigned" />
            </div>
          </FieldGroup>

          <FieldGroup label="Reminders" description="Automated alerts before an appointment starts.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Toggle checked={notifs.reminder24h} onChange={() => toggle('reminder24h')} label="24 hours before" />
              <Toggle checked={notifs.reminder1h} onChange={() => toggle('reminder1h')} label="1 hour before" />
            </div>
          </FieldGroup>

          <FieldGroup label="Reports" description="Scheduled business summaries.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Toggle checked={notifs.weeklyReport} onChange={() => toggle('weeklyReport')} label="Weekly performance report" />
            </div>
          </FieldGroup>

          <div className="pt-5 flex justify-end">
            <SaveButton saved={saved} />
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
  { id: 'business',      label: 'Business Info',  icon: <Building2 className="h-4 w-4" /> },
  { id: 'profile',       label: 'Profile',        icon: <User className="h-4 w-4" /> },
  { id: 'security',      label: 'Security',       icon: <Key className="h-4 w-4" /> },
  { id: 'notifications', label: 'Notifications',  icon: <Bell className="h-4 w-4" /> },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('business');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account settings and business preferences.</p>
      </div>

      {/* ── Tabbed Interface ── */}
      <div className="bg-muted/50 p-1.5 rounded-xl border flex overflow-x-auto hide-scrollbar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap",
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content Panel ── */}
      <div className="pt-2">
        {activeTab === 'business'      && <BusinessSettings />}
        {activeTab === 'profile'       && <ProfileSettings />}
        {activeTab === 'security'      && <PasswordSettings />}
        {activeTab === 'notifications' && <NotificationSettings />}
      </div>
    </div>
  );
}
