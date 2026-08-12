'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api } from '../../../lib/api';

function ResetForm() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/auth/password-reset/confirm', { token, newPassword: password });
      setDone(true);
    } catch (err: any) {
      setError(err?.message || 'Zurücksetzen fehlgeschlagen.');
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="mb-4 text-4xl" aria-hidden>✅</div>
        <p>Passwort erfolgreich geändert. Du kannst dich jetzt anmelden.</p>
        <a href="/login" className="btn-primary mt-4 inline-block">{t('loginTitle')}</a>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-red-600">Ungültiger oder fehlender Reset-Link.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-2 text-2xl font-bold">{t('resetTitle')}</h1>
      <p className="mb-6 text-sm text-[rgb(var(--foreground))]/70">{t('resetConfirmDesc')}</p>
      <form onSubmit={submit} className="space-y-4">
        <input
          type="password"
          required
          minLength={8}
          className="input"
          placeholder={t('resetNewPassword')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="btn-primary w-full">{t('resetSubmit')}</button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Lädt…</div>}>
      <ResetForm />
    </Suspense>
  );
}