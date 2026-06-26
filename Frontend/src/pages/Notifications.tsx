import { useState, useMemo } from 'react';
import {
  Bell, Check, Trash2, Calendar, CreditCard,
  AlertTriangle, CheckCircle2, Info, Search, Clock
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, Notification } from '../hooks/queries/useNotifications';
import { SkeletonCard } from '../components/common';
import { formatDate, formatTimeAgo } from '../utils';

// ─── Types & Constants ────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { icon: React.ReactNode; bg: string }> = {
  SYSTEM:  { icon: <Info className="h-5 w-5 text-blue-600" />, bg: 'bg-blue-100 dark:bg-blue-900/30' },
  BOOKING: { icon: <Calendar className="h-5 w-5 text-violet-600" />, bg: 'bg-violet-100 dark:bg-violet-900/30' },
  PAYMENT: { icon: <CreditCard className="h-5 w-5 text-emerald-600" />, bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  ALERT:   { icon: <AlertTriangle className="h-5 w-5 text-amber-600" />, bg: 'bg-amber-100 dark:bg-amber-900/30' },
  DEFAULT: { icon: <Bell className="h-5 w-5 text-gray-600" />, bg: 'bg-gray-100 dark:bg-gray-900/30' },
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const { data: notifData, isLoading } = useNotifications();
  const notifications: Notification[] = notifData?.notifications ?? [];
  
  const markReadReq = useMarkNotificationRead();
  const markAllReadReq = useMarkAllNotificationsRead();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | string>('ALL');

  const filtered = useMemo(() => {
    let rows = [...notifications];
    
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r => r.title.toLowerCase().includes(q) || r.message.toLowerCase().includes(q));
    }
    
    // Filter tabs
    if (filter === 'UNREAD') {
      rows = rows.filter(r => !r.isRead);
    } else if (filter !== 'ALL') {
      rows = rows.filter(r => r.type === filter);
    }
    
    return rows;
  }, [notifications, search, filter]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await markReadReq.mutateAsync(id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllReadReq.mutateAsync();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = (id: string) => {
    // Backend doesn't support deleting notifications yet. Mock it here visually if needed,
    // but typically users only mark as read.
    console.log('Delete notification', id);
  };

  const handleClearAll = () => {
    // Backend doesn't support clearing notifications yet.
    if (window.confirm('Clearing all notifications is not supported yet by the API.')) {
      // noop
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 p-4">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} rows={2} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-0">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Notification Center
            {unreadCount > 0 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your alerts, updates, and messages.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleMarkAllAsRead} disabled={unreadCount === 0 || markAllReadReq.isPending} className="gap-2">
            <CheckCircle2 className="h-4 w-4" /> {markAllReadReq.isPending ? 'Marking...' : 'Mark all as read'}
          </Button>
          <Button variant="outline" className="text-destructive hover:bg-destructive/10 gap-2" onClick={handleClearAll} disabled={notifications.length === 0}>
            <Trash2 className="h-4 w-4" /> Clear all
          </Button>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card p-3 rounded-xl border shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* Tabs */}
          <div className="flex bg-muted/50 p-1 rounded-lg border overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setFilter('ALL')}
              className={cn("px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors", filter === 'ALL' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              All
            </button>
            <button
              onClick={() => setFilter('UNREAD')}
              className={cn("px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors", filter === 'UNREAD' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              Unread
            </button>
            <div className="w-px bg-border mx-1 my-1" />
            <button onClick={() => setFilter('APPOINTMENT_CREATED')} className={cn("px-3 py-1.5 text-sm font-medium rounded-md transition-colors", filter === 'APPOINTMENT_CREATED' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>Bookings</button>
            <button onClick={() => setFilter('PAYMENT')} className={cn("px-3 py-1.5 text-sm font-medium rounded-md transition-colors", filter === 'PAYMENT' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>Payments</button>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input 
            type="text" placeholder="Search notifications..." 
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="border-dashed shadow-sm">
            <CardContent className="py-20 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-foreground">You're all caught up!</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                No notifications found matching your current filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          filtered.map(notif => {
            const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG['BOOKING']; // Fallback to BOOKING for APPOINTMENT_CREATED
            return (
              <Card 
                key={notif.id} 
                className={cn(
                  "group relative overflow-hidden transition-all duration-200 border-l-4 hover:shadow-md",
                  !notif.isRead ? "border-l-primary bg-primary/[0.02]" : "border-l-transparent bg-card"
                )}
              >
                <div className="flex items-start gap-4 p-4 sm:p-5">
                  {/* Icon */}
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full mt-0.5", config.bg)}>
                    {config.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                      <p className={cn("text-base font-semibold truncate", !notif.isRead ? "text-foreground" : "text-muted-foreground")}>
                        {notif.title}
                      </p>
                      <span className="text-xs font-medium text-muted-foreground shrink-0 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span title={formatDate(notif.createdAt)}>{formatTimeAgo(notif.createdAt)}</span>
                      </span>
                    </div>
                    <p className={cn("text-sm leading-relaxed", !notif.isRead ? "text-foreground/90" : "text-muted-foreground")}>
                      {notif.message}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notif.isRead && (
                        <button onClick={() => handleMarkAsRead(notif.id)} className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                          <Check className="h-3.5 w-3.5" /> Mark as read
                        </button>
                      )}
                      <button onClick={() => handleDelete(notif.id)} className="text-xs font-medium text-destructive hover:underline flex items-center gap-1">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                  
                  {/* Unread Indicator dot */}
                  {!notif.isRead && (
                    <div className="absolute top-1/2 -translate-y-1/2 right-4 sm:right-6">
                      <span className="flex h-3 w-3 rounded-full bg-primary shadow-[0_0_0_4px_rgba(99,102,241,0.1)]" />
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
