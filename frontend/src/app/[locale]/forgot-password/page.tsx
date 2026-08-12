'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '../../../lib/api';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/auth/password-reset/request', { email });
    setSent(true);
  };

  if (sent) {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="mb-4 text-4xl" aria-hidden>📧</div>
        <p className="text-[rgb(var(--foreground))]/70">{t('resetRequestDesc')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-2 text-2xl font-bold">{t('resetTitle')}</h1>
      <p className="mb-6 text-sm text-[rgb(var(--foreground))]/70">{t('resetRequestDesc')}</p>
      <form onSubmit={submit} className="space-y-4">
        <input
          type="email"
          required
          className="input"
          placeholder={t('loginEmail')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="btn-primary w-full">{t('resetSubmit')}</button>
      </form>
    </div>
  );
}