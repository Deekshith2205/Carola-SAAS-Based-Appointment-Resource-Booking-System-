import React from 'react';
import { AlertCircle, RefreshCw, Inbox } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Shimmer Skeleton ─────────────────────────────────────────────────────────
// A shimmer sweep animation that looks premium, replacing flat animate-pulse.

function ShimmerBar({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-muted',
        'before:absolute before:inset-0 before:-translate-x-full',
        'before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
        'before:animate-[shimmer_1.6s_infinite]',
        className
      )}
      style={style}
    />
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────
interface BadgeProps {
  label: string;
  color: string;
  className?: string;
}

export function StatusBadge({ label, color, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', color, className)}>
      {label}
    </span>
  );
}

// ─── LoadingSpinner ───────────────────────────────────────────────────────────
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className={cn('animate-spin rounded-full border-2 border-muted border-t-primary', sizeClasses[size])} />
    </div>
  );
}

// ─── PageLoader ───────────────────────────────────────────────────────────────
// Full-page centered spinner for route-level loading states.
export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <div className="relative">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full border-2 border-primary/20" />
      </div>
      {label && <p className="text-sm text-muted-foreground font-medium animate-pulse">{label}</p>}
    </div>
  );
}

// ─── ErrorMessage ─────────────────────────────────────────────────────────────
interface ErrorMessageProps {
  message: string;
  className?: string;
}

export function ErrorMessage({ message, className }: ErrorMessageProps) {
  return (
    <div className={cn('rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive', className)}>
      {message}
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 p-12 text-center',
      className
    )}>
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground shadow-inner">
        {icon ?? <Inbox className="h-7 w-7" />}
      </div>
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mt-1.5 text-sm text-muted-foreground max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ─── PageHeader ───────────────────────────────────────────────────────────────
interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { value: string; up: boolean };
}

export function StatCard({ title, value, subtitle, icon, trend }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6 flex flex-row items-center justify-between pb-2">
        <h3 className="tracking-tight text-sm font-medium text-muted-foreground">{title}</h3>
        {icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        )}
      </div>
      <div className="px-6 pb-6 pt-0">
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          {trend && (
            <span className={cn(
              'text-xs font-medium px-1.5 py-0.5 rounded-full',
              trend.up
                ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30'
                : 'text-rose-700 bg-rose-100 dark:text-rose-400 dark:bg-rose-900/30'
            )}>
              {trend.up ? '↑' : '↓'} {trend.value}
            </span>
          )}
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────
export function SkeletonCard({ rows = 1 }: { rows?: number }) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3 overflow-hidden">
      <ShimmerBar className="h-4 w-1/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <ShimmerBar key={i} className="h-3" style={{ width: `${65 + (i % 3) * 12}%` }} />
      ))}
    </div>
  );
}

// ─── SkeletonTable ────────────────────────────────────────────────────────────
export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 px-5 py-3 border-b bg-muted/30">
        {Array.from({ length: cols }).map((_, c) => (
          <ShimmerBar key={c} className="h-3 flex-1" style={{ opacity: 0.6 }} />
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 px-5 py-4" style={{ animationDelay: `${r * 60}ms` }}>
            {Array.from({ length: cols }).map((_, c) => (
              <ShimmerBar key={c} className="h-4 flex-1" style={{ width: c === 0 ? '40%' : undefined }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SkeletonStatCards ────────────────────────────────────────────────────────
export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-6 space-y-3 overflow-hidden">
          <div className="flex justify-between items-center">
            <ShimmerBar className="h-3 w-24" />
            <ShimmerBar className="h-9 w-9 rounded-lg" />
          </div>
          <ShimmerBar className="h-7 w-20" />
          <ShimmerBar className="h-2.5 w-32" />
        </div>
      ))}
    </div>
  );
}

// ─── ApiErrorBanner ───────────────────────────────────────────────────────────
export function ApiErrorBanner({
  error,
  retry,
  onDismiss,
  title,
}: {
  error: unknown;
  retry?: () => void;
  onDismiss?: () => void;
  title?: string;
}) {
  const msg =
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    (error as { message?: string })?.message ||
    'Failed to load data.';

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3.5 text-sm"
    >
      <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold text-destructive mb-0.5">{title}</p>}
        <p className="text-destructive/80">{msg}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {retry && (
          <button
            onClick={retry}
            className="flex items-center gap-1.5 text-xs font-medium text-destructive hover:text-destructive/80 underline underline-offset-2 hover:no-underline transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
