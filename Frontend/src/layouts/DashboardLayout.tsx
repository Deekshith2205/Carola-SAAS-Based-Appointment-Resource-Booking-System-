import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useSidebar } from '../hooks/useSidebar';
import { Sidebar, Navbar } from '../components/layout';
import { cn } from '../lib/utils';

export default function DashboardLayout() {
  const { isCollapsed, toggle } = useSidebar();
  // Mobile overlay: sidebar visible on mobile when true
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Mobile overlay backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ── */}
      {/* Desktop: always visible, collapses to icon strip */}
      <div className="hidden md:flex shrink-0">
        <Sidebar isCollapsed={isCollapsed} onToggle={toggle} />
      </div>

      {/* Mobile: off-canvas drawer */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex md:hidden transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar isCollapsed={false} onToggle={() => setMobileOpen(false)} />
      </div>

      {/* ── Main content area ── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Navbar */}
        <Navbar onMenuToggle={() => setMobileOpen((p) => !p)} />

        {/* Page content */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto overflow-x-hidden"
        >
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
