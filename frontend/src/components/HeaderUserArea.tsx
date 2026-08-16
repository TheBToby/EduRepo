'use client';

// Header-Bereich fuer den angemeldeten Nutzer: Avatar, Name und Abmelden.
// Gaeste sehen nichts (Login/Registrierung laeuft ueber die Landing Page).
import { useTranslations } from 'next-intl';
import { useRouter } from '../i18n/navigation';
import { useSession } from './SessionProvider';
import { Avatar } from './Avatar';

export function HeaderUserArea() {
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { user, loading, logout } = useSession();

  if (loading) return null;
  if (!user) return null;

  return (
    <div className="ml-2 flex items-center gap-2 border-l border-[rgb(var(--border))] pl-3">
      <button
        onClick={() => router.push('/profile')}
        className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium hover:bg-[rgb(var(--muted))]"
        title={user.email}
      >
        {/* Avatar mit Standard-Profilbild, wenn keines hochgeladen wurde */}
        <Avatar avatarUrl={user.avatarUrl} name={user.displayName || user.email} size={28} />
        <span className="hidden max-w-[10rem] truncate sm:inline">{user.displayName}</span>
      </button>
      <button
        onClick={async () => {
          await logout();
          router.push('/');
          router.refresh();
        }}
        className="rounded-lg px-2 py-1 text-sm font-medium text-[rgb(var(--foreground))]/70 hover:bg-[rgb(var(--muted))]"
      >
        {tCommon('logout')}
      </button>
    </div>
  );
}