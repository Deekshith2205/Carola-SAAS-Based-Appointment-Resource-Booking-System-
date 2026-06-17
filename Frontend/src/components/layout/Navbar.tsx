import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Sun, Moon, Menu, ChevronDown, LogOut, User, Settings } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '../../context/AuthContext';
import Breadcrumb from './Breadcrumb';
import { cn } from '../../lib/utils';

// ─── Mock notifications ──────────────────────────────────────────────────────
const MOCK_NOTIFICATIONS = [
  { id: '1', title: 'New appointment booked',  desc: 'John Doe booked a 2pm slot',       time: '2m ago',  unread: true  },
  { id: '2', title: 'Staff availability updated', desc: 'Sarah updated her schedule',    time: '15m ago', unread: true  },
  { id: '3', title: 'Payment received',         desc: '$120 received for booking #1023', time: '1h ago',  unread: false },
  { id: '4', title: 'Service limit reached',    desc: 'Haircut slots are fully booked',  time: '3h ago',  unread: false },
];

interface NavbarProps {
  onMenuToggle: () => void;
}

export default function Navbar({ onMenuToggle }: NavbarProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [notifOpen, setNotifOpen]   = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mounted, setMounted]       = useState(false);

  const notifRef   = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Avoid hydration mismatch for theme icon
  useEffect(() => setMounted(true), []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))   setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => n.unread).length;
  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  const isDark = theme === 'dark';

  return (
    <header className="navbar sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card/80 backdrop-blur-md px-4 md:px-6">
      {/* Left – menu toggle + breadcrumb */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          id="navbar-menu-btn"
          onClick={onMenuToggle}
          aria-label="Toggle sidebar"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0 md:hidden"
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
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          {mounted && (isDark ? <Sun size={16} /> : <Moon size={16} />)}
        </button>

        {/* Notification bell */}
        <div ref={notifRef} className="relative">
          <button
            id="notification-bell-btn"
            onClick={() => { setNotifOpen((p) => !p); setProfileOpen(false); }}
            aria-label="Notifications"
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="notification-badge absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold leading-none">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {notifOpen && (
            <div className="dropdown-panel absolute right-0 top-10 w-80 rounded-xl border bg-popover shadow-xl overflow-hidden z-50 animate-in">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="text-sm font-semibold">Notifications</span>
                <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
              </div>
              <div className="divide-y max-h-72 overflow-y-auto">
                {MOCK_NOTIFICATIONS.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      'flex gap-3 px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer',
                      n.unread && 'bg-primary/5'
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      <span className={cn('block w-2 h-2 rounded-full mt-1', n.unread ? 'bg-primary' : 'bg-transparent')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{n.desc}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0 mt-0.5">{n.time}</span>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 border-t text-center">
                <button className="text-xs text-primary hover:underline font-medium">View all notifications</button>
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
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors"
          >
            {/* Avatar */}
            <div className="user-avatar flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs font-bold shrink-0">
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
            <div className="dropdown-panel absolute right-0 top-11 w-52 rounded-xl border bg-popover shadow-xl overflow-hidden z-50 animate-in">
              {/* User info header */}
              <div className="px-4 py-3 border-b bg-accent/30">
                <p className="text-sm font-semibold">{user?.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{user?.email}</p>
              </div>

              <div className="py-1.5">
                <Link
                  to="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <User size={14} className="text-muted-foreground" />
                  Profile
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <Settings size={14} className="text-muted-foreground" />
                  Settings
                </Link>
              </div>

              <div className="border-t py-1.5">
                <button
                  id="logout-btn"
                  onClick={() => { setProfileOpen(false); logout(); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
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
