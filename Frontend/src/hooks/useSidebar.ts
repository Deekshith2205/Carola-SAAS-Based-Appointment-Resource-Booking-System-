import { useState, useEffect, useCallback } from 'react';

const SIDEBAR_KEY = 'saas_sidebar_collapsed';

export function useSidebar() {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggle = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, String(next));
      return next;
    });
  }, []);

  const collapse = useCallback(() => {
    setIsCollapsed(true);
    localStorage.setItem(SIDEBAR_KEY, 'true');
  }, []);

  const expand = useCallback(() => {
    setIsCollapsed(false);
    localStorage.setItem(SIDEBAR_KEY, 'false');
  }, []);

  // Auto-collapse on small screens
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) collapse();
    };
    if (mq.matches) collapse();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [collapse]);

  return { isCollapsed, toggle, collapse, expand };
}
