import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const LABEL_MAP: Record<string, string> = {
  dashboard:    'Dashboard',
  appointments: 'Appointments',
  staff:        'Staff',
  services:     'Services',
  resources:    'Resources',
  analytics:    'Analytics',
  settings:     'Settings',
};

export default function Breadcrumb() {
  const location = useLocation();

  const segments = location.pathname
    .split('/')
    .filter(Boolean);

  const crumbs = segments.map((seg, idx) => {
    const to = '/' + segments.slice(0, idx + 1).join('/');
    const label = LABEL_MAP[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1);
    const isLast = idx === segments.length - 1;
    return { to, label, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      <Link
        to="/dashboard"
        className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home size={14} />
      </Link>

      {crumbs.map((crumb) => (
        <React.Fragment key={crumb.to}>
          <ChevronRight size={13} className="text-muted-foreground/50 shrink-0" />
          {crumb.isLast ? (
            <span className="font-medium text-foreground truncate max-w-[180px]">
              {crumb.label}
            </span>
          ) : (
            <Link
              to={crumb.to}
              className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[140px]"
            >
              {crumb.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
