import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Sun, Moon, Menu, ChevronDown, LogOut, User, Settings, Info, Calendar, CreditCard, AlertTriangle } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../hooks/queries/useNotifications';
import Breadcrumb from './Breadcrumb';
import { cn } from '../../lib/utils';
import { formatDate } from '../../utils';

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; bg: string }> = {
  SYSTEM:  { icon: <Info className="h-3.5 w-3.5 text-blue-600" />, bg: 'bg-blue-100 dark:bg-blue-900/30' },
  BOOKING: { icon: <Calendar className="h-3.5 w-3.5 text-violet-600" />, bg: 'bg-violet-100 dark:bg-violet-900/30' },
  PAYMENT: { icon: <CreditCard className="h-3.5 w-3.5 text-emerald-600" />, bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  ALERT:   { icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />, bg: 'bg-amber-100 dark:bg-amber-900/30' },
  DEFAULT: { icon: <Bell className="h-3.5 w-3.5 text-gray-600" />, bg: 'bg-gray-100 dark:bg-gray-900/30' },
};

interface NavbarProps {
  onMenuToggle: () => void;
}

export default function Navbar({ onMenuToggle }: NavbarProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  
  const { data: notificationsData } = useNotifications();
  const notifications = notificationsData?.notifications ?? [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const [notifOpen, setNotifOpen]   = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mounted, setMounted]       = useState(false);

  const notifRef   = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Avoid hydration mismatch for theme icon
  useEffect(() => setMounted(true), []);

  // Close dropdowns on outside click or Escape key
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))   setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setNotifOpen(false);
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  const isDark = theme === 'dark';

  return (
    <header role="banner" aria-label="Main Navigation" className="navbar sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card/80 backdrop-blur-md px-4 md:px-6 transition-all duration-200">
      {/* Left – menu toggle + breadcrumb */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          id="navbar-menu-btn"
          onClick={onMenuToggle}
          aria-label="Toggle sidebar"
          aria-expanded="false"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0 md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Menu size={18} />
        </button>

        <Breadcrumb />
      </div>

      {/* Right – actions */}
      <div className="flex items-center gap-1.5 shrink-0">

        {/* Dark mode toggle */}
        <button
          id="theme-toggle-btn"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          aria-label="Toggle theme"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {mounted && (isDark ? <Sun size={16} /> : <Moon size={16} />)}
        </button>

        {/* Notification bell */}
        <div ref={notifRef} className="relative">
          <button
            id="notification-bell-btn"
            onClick={() => { setNotifOpen((p) => !p); setProfileOpen(false); }}
            aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
            aria-expanded={notifOpen}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="notification-badge absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold leading-none ring-2 ring-background">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {notifOpen && (
            <div 
              role="menu"
              aria-label="Notifications"
              className="dropdown-panel absolute right-0 top-10 w-80 rounded-xl border bg-popover shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
                <span className="text-sm font-semibold">Notifications</span>
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{unreadCount} new</span>
              </div>
              <div className="divide-y max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.slice(0, 5).map((n) => {
                    const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.DEFAULT;
                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          setNotifOpen(false);
                          navigate('/notifications');
                        }}
                        className={cn(
                          'flex gap-3 px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer',
                          !n.isRead && 'bg-primary/[0.03]'
                        )}
                      >
                        <div className={cn("mt-0.5 shrink-0 flex h-7 w-7 items-center justify-center rounded-full", cfg.bg)}>
                          {cfg.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm truncate", !n.isRead ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>
                            {n.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{n.message}</p>
                          <p className="text-[10px] font-medium text-muted-foreground mt-1">{formatDate(n.createdAt)}</p>
                        </div>
                        {!n.isRead && <span className="shrink-0 mt-2 block w-2 h-2 rounded-full bg-primary" />}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="px-4 py-2.5 border-t text-center bg-muted/20">
                <Link to="/notifications" onClick={() => setNotifOpen(false)} className="text-xs text-primary hover:underline font-medium">
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-border mx-1" />

        {/* User profile dropdown */}
        <div ref={profileRef} className="relative">
          <button
            id="user-profile-btn"
            onClick={() => { setProfileOpen((p) => !p); setNotifOpen(false); }}
            aria-label="User menu"
            aria-expanded={profileOpen}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {/* Avatar */}
            <div className="user-avatar flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs font-bold shrink-0 shadow-sm">
              {initials}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold leading-tight truncate max-w-[100px]">{user?.name ?? 'User'}</p>
              <p className="text-[10px] text-muted-foreground leading-tight truncate max-w-[100px]">{user?.role ?? ''}</p>
            </div>
            <ChevronDown size={13} className={cn('text-muted-foreground transition-transform duration-200', profileOpen && 'rotate-180')} />
          </button>

          {/* Profile dropdown */}
          {profileOpen && (
            <div 
              role="menu"
              className="dropdown-panel absolute right-0 top-11 w-52 rounded-xl border bg-popover shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              {/* User info header */}
              <div className="px-4 py-3 border-b bg-muted/30">
                <p className="text-sm font-semibold">{user?.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{user?.email}</p>
              </div>

              <div className="py-1.5">
                <Link
                  to="/settings"
                  role="menuitem"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-accent transition-colors focus-visible:outline-none focus-visible:bg-accent"
                >
                  <User size={14} className="text-muted-foreground" />
                  Profile
                </Link>
                <Link
                  to="/settings"
                  role="menuitem"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-accent transition-colors focus-visible:outline-none focus-visible:bg-accent"
                >
                  <Settings size={14} className="text-muted-foreground" />
                  Settings
                </Link>
              </div>

              <div className="border-t py-1.5">
                <button
                  id="logout-btn"
                  role="menuitem"
                  onClick={() => { setProfileOpen(false); logout(); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:bg-destructive/10"
                >
                  <LogOut size={14} />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
