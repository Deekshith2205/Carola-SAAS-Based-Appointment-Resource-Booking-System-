import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, Users, Briefcase,
  Archive, BarChart3, Settings, ChevronLeft, ChevronRight, Zap, X,
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
  /** Mobile drawer open state */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ isCollapsed, onToggle, mobileOpen = false, onMobileClose }: SidebarProps) {
  const location = useLocation();

  // Close mobile drawer on route change
  useEffect(() => {
    onMobileClose?.();
  }, [location.pathname]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) onMobileClose?.();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [mobileOpen, onMobileClose]);

  const SidebarContent = () => (
    <aside
      aria-label="Main navigation"
      className={cn(
        'sidebar relative flex flex-col border-r bg-card transition-all duration-300 ease-in-out shrink-0 h-full',
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
            Calora
          </span>
        )}
      </div>

      {/* Nav */}
      <nav
        role="navigation"
        aria-label="Sidebar navigation"
        className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden"
      >
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.to === '/dashboard'
              ? location.pathname === '/dashboard'
              : location.pathname.startsWith(item.to);

          return (
            <div key={item.to} className="relative group">
              <NavLink
                to={item.to}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'sidebar-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none',
                  isCollapsed ? 'justify-center px-0 mx-1' : '',
                  isActive
                    ? 'sidebar-item-active bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <span className="shrink-0">{item.icon}</span>
                {!isCollapsed && <span className="truncate">{item.label}</span>}
                {isActive && !isCollapsed && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
                )}
              </NavLink>

              {/* Tooltip when collapsed */}
              {isCollapsed && (
                <div
                  role="tooltip"
                  className="sidebar-tooltip absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 pointer-events-none"
                >
                  <div className="bg-popover text-popover-foreground text-xs font-medium px-2.5 py-1.5 rounded-md shadow-lg border whitespace-nowrap">
                    {item.label}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        id="sidebar-toggle-btn"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-20 z-20 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <SidebarContent />
      </div>

      {/* Mobile overlay drawer */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 flex md:hidden animate-in slide-in-from-left duration-250">
            <div className="relative flex flex-col bg-card border-r shadow-2xl w-[260px] h-full">
              {/* Close button */}
              <button
                onClick={onMobileClose}
                aria-label="Close navigation"
                className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X size={16} />
              </button>

              {/* Brand */}
              <div className="flex items-center gap-3 px-4 py-5 border-b pr-12">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground shrink-0 shadow-md">
                  <Zap size={16} />
                </div>
                <div className="flex flex-col text-left overflow-hidden">
                  <span className="text-sm font-semibold truncate leading-none mb-1">Calora</span>
                  <span className="text-xs text-muted-foreground truncate leading-none">Free Plan</span>
                </div>
              </div>

              {/* Nav */}
              <nav
                role="navigation"
                aria-label="Mobile navigation"
                className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto"
              >
                {NAV_ITEMS.map((item) => {
                  const isActive =
                    item.to === '/dashboard'
                      ? location.pathname === '/dashboard'
                      : location.pathname.startsWith(item.to);

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      <span>{item.label}</span>
                      {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />}
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          </div>
        </>
      )}
    </>
  );
}
