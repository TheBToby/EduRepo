'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { Link } from '../../../i18n/navigation';

export default function RegisterPage() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [form, setForm] = useState({ displayName: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      router.push('/pending');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Registrierung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-2 text-2xl font-bold">{t('registerTitle')}</h1>
      <p className="mb-6 text-sm text-[rgb(var(--foreground))]/70">{t('registerNotice')}</p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">{t('registerName')}</label>
          <input
            required
            className="input"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('registerEmail')}</label>
          <input
            type="email"
            required
            className="input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('registerPassword')}</label>
          <input
            type="password"
            required
            minLength={8}
            className="input"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="new-password"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? tCommon('loading') : t('registerSubmit')}
        </button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-brand-600 hover:underline dark:text-brand-400">
          {t('loginTitle')}
        </Link>
      </p>
    </div>
  );
}