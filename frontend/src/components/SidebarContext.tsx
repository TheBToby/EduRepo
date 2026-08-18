'use client';

// Kontext fuer den Zustand der Navigations-Sidebar (minimiert/expandiert).
// Die Preferenz wird client-seitig im localStorage persistiert, damit sie
// ueber Neuladen/Logins hinweg erhalten bleibt.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'edurepo-sidebar-collapsed';

// Breiten der permanenten Sidebar (Desktop): voll vs. minimiert (nur Icons)
export const EXPANDED_WIDTH = 256;
export const COLLAPSED_WIDTH = 64;

type SidebarContextValue = {
  collapsed: boolean;
  toggle: () => void;
};

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  toggle: () => {},
});

export function SidebarStateProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  // Gespeicherte Preferenz laden (erst nach Mount -> hydration-safe)
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      /* localStorage nicht verfuegbar -> Default behalten */
    }
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* Persistenz optional */
      }
      return next;
    });
  };

  return <SidebarContext.Provider value={{ collapsed, toggle }}>{children}</SidebarContext.Provider>;
}

export function useSidebarState() {
  return useContext(SidebarContext);
}