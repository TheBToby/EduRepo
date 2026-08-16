'use client';

// Moderne Sidebar-Navigation: nur fuer angemeldete Nutzer sichtbar.
// Zeigt ausschliesslich die Features, die fuer Rolle/Profil verfuegbar sind.
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '../i18n/navigation';
import { useSession } from './SessionProvider';
import { Avatar } from './Avatar';

type NavItem = {
  href: string;
  labelKey: string;
  icon: string;
  roles?: Array<'USER' | 'MODERATOR' | 'ADMIN'>; // undefined = alle angemeldeten Nutzer
};

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', labelKey: 'dashboard', icon: '🏠' },
  { href: '/repositories', labelKey: 'myRepos', icon: '📚' },
  { href: '/browse', labelKey: 'browse', icon: '🔍' },
  { href: '/profile', labelKey: 'profile', icon: '👤' },
  { href: '/admin', labelKey: 'admin', icon: '🛡️', roles: ['MODERATOR', 'ADMIN'] },
];

export function Sidebar() {
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useSession();
  const [open, setOpen] = useState(false); // Mobile-Toggle

  // Gaeste sehen die Sidebar ueberhaupt nicht
  if (loading) return null;
  if (!user) return null;

  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role));

  const handleLogout = async () => {
    await logout();
    router.push('/');
    router.refresh();
  };

  return (
    <>
      {/* Mobile: Toggle-Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 left-4 z-50 rounded-full bg-brand-600 p-3 text-white shadow-lg md:hidden"
        aria-label="Menu"
      >
        {open ? '✕' : '☰'}
      </button>

      {/* Overlay fuer Mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-[rgb(var(--border))] bg-[rgb(var(--background))] transition-transform md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-[rgb(var(--border))] px-4">
          <a href="/" className="flex items-center gap-2 font-bold">
            <span className="rounded bg-brand-600 px-2 py-1 text-white">EduRepo</span>
          </a>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <a
                key={item.href}
                href={`/${item.href}`}
                onClick={(e) => {
                  e.preventDefault();
                  setOpen(false);
                  router.push(item.href);
                }}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-brand-600 text-white'
                    : 'text-[rgb(var(--foreground))]/80 hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]'
                }`}
              >
                <span className="text-lg" aria-hidden>{item.icon}</span>
                {t(item.labelKey)}
              </a>
            );
          })}
        </nav>

        {/* Nutzer-Bereich unten */}
        <div className="border-t border-[rgb(var(--border))] p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            {/* Avatar mit Standard-Profilbild, wenn keines hochgeladen wurde */}
            <Avatar avatarUrl={user.avatarUrl} name={user.displayName || user.email} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.displayName}</p>
              <p className="truncate text-xs text-[rgb(var(--foreground))]/50">{user.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[rgb(var(--foreground))]/80 transition-colors hover:bg-[rgb(var(--muted))]"
          >
            <span className="text-lg" aria-hidden>⏻</span>
            {tCommon('logout')}
          </button>
        </div>
      </aside>
    </>
  );
}