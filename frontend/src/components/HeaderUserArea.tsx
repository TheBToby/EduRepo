'use client';

// Header-Bereich fuer den angemeldeten Nutzer: Avatar, Name und Abmelden.
// Gaeste sehen nichts (Login/Registrierung laeuft ueber die Landing Page).
import { useTranslations } from 'next-intl';
import { useRouter } from '../i18n/navigation';
import { useSession, avatarSrc } from './SessionProvider';

export function HeaderUserArea() {
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { user, loading, logout } = useSession();

  if (loading) return null;
  if (!user) return null;

  const initials = (user.displayName || user.email)
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="ml-2 flex items-center gap-2 border-l border-[rgb(var(--border))] pl-3">
      <button
        onClick={() => router.push('/profile')}
        className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium hover:bg-[rgb(var(--muted))]"
        title={user.email}
      >
        {avatarSrc(user.avatarUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarSrc(user.avatarUrl) as string} alt="" className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
            {initials}
          </span>
        )}
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