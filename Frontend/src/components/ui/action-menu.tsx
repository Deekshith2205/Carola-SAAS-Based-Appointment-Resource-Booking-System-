import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ActionMenuProps {
  children: React.ReactNode;
}

export function ActionMenu({ children }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: -9999, left: -9999, opacity: 0 });

  useLayoutEffect(() => {
    if (open && buttonRef.current && menuRef.current) {
      const btnRect = buttonRef.current.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      
      const spaceBelow = window.innerHeight - btnRect.bottom;
      const spaceAbove = btnRect.top;
      
      let top = btnRect.bottom + window.scrollY + 4;
      let left = btnRect.right - menuRect.width + window.scrollX;
      
      // Smart positioning: open upward if insufficient space below
      if (spaceBelow < menuRect.height && spaceAbove > menuRect.height) {
        top = btnRect.top + window.scrollY - menuRect.height - 4;
      }
      
      // Viewport collision detection for left/right edges
      if (left < 0) {
        left = btnRect.left + window.scrollX;
      }
      
      setCoords({ top, left, opacity: 1 });
    } else if (!open) {
      setCoords({ top: -9999, left: -9999, opacity: 0 });
    }
  }, [open, children]); // Re-calculate if children change (height might change)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    
    // Close on any scroll event in the window to prevent detached floating menus
    const handleScroll = (e: Event) => {
      // Don't close if scrolling inside the menu itself (if it ever becomes scrollable)
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(o => !o);
        }}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="absolute z-50 w-44 rounded-lg border bg-card shadow-lg py-1 transition-opacity duration-100"
            style={{ top: coords.top, left: coords.left, opacity: coords.opacity }}
            onClick={(e) => {
              e.stopPropagation();
              // Auto-close when clicking any item inside the menu
              setOpen(false);
            }}
          >
            {children}
          </div>,
          document.body
        )}
    </>
  );
}

export function ActionMenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-1.5 text-sm transition-colors hover:bg-accent',
        danger ? 'text-destructive hover:text-destructive' : 'text-foreground'
      )}
    >
      {icon} {label}
    </button>
  );
}

export function ActionMenuSeparator() {
  return <div className="my-1 border-t border-border" />;
}
