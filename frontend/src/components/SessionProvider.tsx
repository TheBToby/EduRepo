'use client';

// Zentraler Session-Kontext: laedt den aktuellen Nutzer (via /users/me),
// stellt ihn allen Komponenten zur Verfuegung und bietet refresh/logout.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  status: string;
};

/**
 * Avatar-URL fuer <img src> aufloesen. Interne Keys ("avatar:<key>") werden
 * auf den stabilen Backend-Endpunkt /api/users/me/avatar gemappt.
 */
export function avatarSrc(avatarUrl?: string | null): string | null {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('avatar:')) return '/api/users/me/avatar';
  return avatarUrl;
}

type SessionContextValue = {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me', { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        setUser(await res.json());
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SessionContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}