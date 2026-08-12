'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { api, ApiError } from '../../../lib/api';

type Profile = {
  id: string;
  displayName: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
  uiLanguage: 'DE' | 'FR' | 'IT' | 'EN';
  themePreference: 'LIGHT' | 'DARK' | 'SYSTEM';
};

export default function ProfilePage() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { setTheme } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .get<Profile>('/users/me')
      .then(setProfile)
      .catch((err: ApiError) => {
        if (err.status === 401) router.push('/login');
        else setError(err.message);
      });
  }, [router]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaved(false);
    await api.patch('/users/me', {
      displayName: profile.displayName,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      uiLanguage: profile.uiLanguage,
      themePreference: profile.themePreference,
    });
    // Theme sofort anwenden
    setTheme(profile.themePreference.toLowerCase());
    setSaved(true);
  };

  const deleteAccount = async () => {
    const transfer = window.prompt(t('transferTo'), '');
    if (transfer === null) return; // abgebrochen
    await api.post('/auth/delete-account', transfer ? { transferToUserId: transfer } : {});
    router.push('/');
  };

  if (error) return <p className="text-red-600">{error}</p>;
  if (!profile) return <p>Lädt…</p>;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">{tCommon('edit')} {tCommon('appName')}</h1>
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">{t('registerName')}</label>
          <input
            className="input"
            value={profile.displayName}
            onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{tCommon('email') || 'E-Mail'}</label>
          <input className="input opacity-70" value={profile.email} disabled />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Bio</label>
          <textarea
            className="input"
            rows={3}
            value={profile.bio || ''}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{tCommon('language')}</label>
          <select
            className="input"
            value={profile.uiLanguage}
            onChange={(e) => setProfile({ ...profile, uiLanguage: e.target.value as any })}
          >
            <option value="DE">Deutsch</option>
            <option value="FR">Français</option>
            <option value="IT">Italiano</option>
            <option value="EN">English</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{tCommon('theme')}</label>
          <select
            className="input"
            value={profile.themePreference}
            onChange={(e) => setProfile({ ...profile, themePreference: e.target.value as any })}
          >
            <option value="LIGHT">{tCommon('light')}</option>
            <option value="DARK">{tCommon('dark')}</option>
            <option value="SYSTEM">{tCommon('system')}</option>
          </select>
        </div>
        {saved && <p className="text-sm text-green-600">✓ Gespeichert</p>}
        <button type="submit" className="btn-primary w-full">{tCommon('save')}</button>
      </form>

      <div className="mt-10 border-t border-[rgb(var(--border))] pt-6">
        <h2 className="mb-2 font-semibold text-red-600">{t('deleteAccountTitle')}</h2>
        <p className="mb-4 text-sm text-[rgb(var(--foreground))]/70">{t('deleteAccountDesc')}</p>
        <button onClick={deleteAccount} className="btn-secondary text-red-600">
          {t('deleteAccountTitle')}
        </button>
      </div>
    </div>
  );
}