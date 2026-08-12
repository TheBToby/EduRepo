'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '../../../lib/api';
import { Link } from '../../../i18n/navigation';

type Me = {
  id: string;
  displayName: string;
  email: string;
  role: string;
  status: string;
};

export default function DashboardPage() {
  const t = useTranslations('nav');
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Me>('/users/me')
      .then(setMe)
      .catch((err: ApiError) => {
        if (err.status === 401) {
          router.push('/login');
        } else {
          setError(err.message);
        }
      });
  }, [router]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!me) return <p>Lädt…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">
          {t('dashboard')}: {me.displayName}
        </h1>
        <p className="text-sm text-[rgb(var(--foreground))]/60">
          {me.email} · {me.role}
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
        {(me.role === 'MODERATOR' || me.role === 'ADMIN') && (
          <Link href="/admin" className="card hover:border-brand-500">
            <div className="mb-2 text-2xl" aria-hidden>🛡️</div>
            <h2 className="font-semibold">{t('admin')}</h2>
          </Link>
        )}
      </div>
    </div>
  );
}