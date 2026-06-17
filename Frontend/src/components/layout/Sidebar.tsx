import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Briefcase,
  Archive,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',    to: '/dashboard',    icon: <LayoutDashboard size={18} /> },
  { label: 'Appointments', to: '/appointments', icon: <CalendarDays    size={18} /> },
  { label: 'Staff',        to: '/staff',        icon: <Users           size={18} /> },
  { label: 'Services',     to: '/services',     icon: <Briefcase       size={18} /> },
  { label: 'Resources',    to: '/resources',    icon: <Archive         size={18} /> },
  { label: 'Analytics',    to: '/analytics',    icon: <BarChart3       size={18} /> },
  { label: 'Settings',     to: '/settings',     icon: <Settings        size={18} /> },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        'sidebar relative flex flex-col border-r bg-card transition-all duration-300 ease-in-out shrink-0',
        isCollapsed ? 'w-[64px]' : 'w-[240px]'
      )}
    >
      {/* Brand */}
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b overflow-hidden', isCollapsed && 'justify-center px-0')}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground shrink-0 shadow-md">
          <Zap size={16} />
        </div>
        {!isCollapsed && (
          <span className="font-bold text-[15px] tracking-tight whitespace-nowrap text-foreground">
            SaaS Booking
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.to === '/dashboard'
              ? location.pathname === '/dashboard'
              : location.pathname.startsWith(item.to);

          return (
            <div key={item.to} className="relative group">
              <NavLink
                to={item.to}
                className={cn(
                  'sidebar-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer select-none',
                  isCollapsed ? 'justify-center px-0 mx-1' : '',
                  isActive
                    ? 'sidebar-item-active bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <span className="shrink-0">{item.icon}</span>
                {!isCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
                {isActive && !isCollapsed && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </NavLink>

              {/* Tooltip when collapsed */}
              {isCollapsed && (
                <div className="sidebar-tooltip absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 pointer-events-none">
                  <div className="bg-popover text-popover-foreground text-xs font-medium px-2.5 py-1.5 rounded-md shadow-lg border whitespace-nowrap">
                    {item.label}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>


      {/* Collapse toggle button */}
      <button
        onClick={onToggle}
        id="sidebar-toggle-btn"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={cn(
          'absolute -right-3 top-20 z-20 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150'
        )}
      >
        {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
