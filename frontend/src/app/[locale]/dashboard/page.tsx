'use client';

import { useTranslations } from 'next-intl';
import { Link } from '../../../i18n/navigation';
import { useSession } from '../../../components/SessionProvider';

export default function DashboardPage() {
  const t = useTranslations('nav');
  const { user, loading } = useSession();

  if (loading) return <p>Lädt…</p>;
  if (!user) {
    return (
      <div className="text-center">
        <p className="mb-4">Bitte melde dich an, um dein Dashboard zu sehen.</p>
        <Link href="/login" className="btn-primary">Login</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">
          {t('dashboard')}: {user.displayName}
        </h1>
        <p className="text-sm text-[rgb(var(--foreground))]/60">
          {user.email} · {user.role}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/repositories" className="card hover:border-brand-500">
          <div className="mb-2 text-2xl" aria-hidden>📚</div>
          <h2 className="font-semibold">{t('myRepos')}</h2>
        </Link>
        <Link href="/browse" className="card hover:border-brand-500">
          <div className="mb-2 text-2xl" aria-hidden>🔍</div>
          <h2 className="font-semibold">{t('browse')}</h2>
        </Link>
        <Link href="/profile" className="card hover:border-brand-500">
          <div className="mb-2 text-2xl" aria-hidden>👤</div>
          <h2 className="font-semibold">{t('profile')}</h2>
        </Link>
        {(user.role === 'MODERATOR' || user.role === 'ADMIN') && (
          <Link href="/admin" className="card hover:border-brand-500">
            <div className="mb-2 text-2xl" aria-hidden>🛡️</div>
            <h2 className="font-semibold">{t('admin')}</h2>
          </Link>
        )}
      </div>
    </div>
  );
}