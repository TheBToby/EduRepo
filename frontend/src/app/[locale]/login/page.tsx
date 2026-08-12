'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '../../../lib/api';
import { Link } from '../../../i18n/navigation';

export default function LoginPage() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/login', { email, password });
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Login fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  const oauth = (provider: 'google' | 'microsoft') => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    window.location.href = `${apiBase}/auth/${provider}`;
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-bold">{t('loginTitle')}</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">{t('loginEmail')}</label>
          <input
            type="email"
            required
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('loginPassword')}</label>
          <input
            type="password"
            required
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? tCommon('loading') : t('loginSubmit')}
        </button>
      </form>

      <div className="my-4 text-center text-sm">
        <Link href="/forgot-password" className="text-brand-600 hover:underline dark:text-brand-400">
          {t('forgotPassword')}
        </Link>
      </div>

      <div className="space-y-2">
        <button onClick={() => oauth('google')} className="btn-secondary w-full">
          {t('loginGoogle')}
        </button>
        <button onClick={() => oauth('microsoft')} className="btn-secondary w-full">
          {t('loginMicrosoft')}
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-[rgb(var(--foreground))]/70">
        <Link href="/register" className="text-brand-600 hover:underline dark:text-brand-400">
          {tCommon('register')}
        </Link>
      </p>
    </div>
  );
}