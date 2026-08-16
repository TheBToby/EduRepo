'use client';

// Profilseite: Profildaten, Profilbild-Upload und Passwortwechsel.
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { api, ApiError } from '../../../lib/api';
import { useSession, avatarSrc } from '../../../components/SessionProvider';

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
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { setTheme } = useTheme();
  const { refresh } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Profilbild
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null);

  // Passwortwechsel
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

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
      uiLanguage: profile.uiLanguage,
      themePreference: profile.themePreference,
    });
    // Theme sofort anwenden
    setTheme(profile.themePreference.toLowerCase());
    setSaved(true);
    refresh();
  };

  const uploadAvatar = async (file: File) => {
    setAvatarUploading(true);
    setAvatarMsg(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const updated = await api.upload<Profile>('/users/me/avatar', formData);
      setProfile((p) => (p ? { ...p, avatarUrl: updated.avatarUrl } : p));
      setAvatarMsg('✓ ' + t('avatarUpdated'));
      refresh(); // Avatar in Sidebar/Header sofort aktualisieren
    } catch (err: any) {
      setAvatarMsg('✗ ' + (err.message || 'Upload fehlgeschlagen.'));
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    setPwError(null);
    if (newPassword !== confirmPassword) {
      setPwError(t('passwordMismatch'));
      return;
    }
    setPwSaving(true);
    try {
      await api.post('/users/me/change-password', { currentPassword, newPassword });
      setPwMsg('✓ ' + t('passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwError(err.message || 'Fehler beim Passwortwechsel.');
    } finally {
      setPwSaving(false);
    }
  };

  const deleteAccount = async () => {
    const transfer = window.prompt(t('transferTo'), '');
    if (transfer === null) return; // abgebrochen
    await api.post('/auth/delete-account', transfer ? { transferToUserId: transfer } : {});
    await refresh();
    router.push('/');
  };

  if (error) return <p className="text-red-600">{error}</p>;
  if (!profile) return <p>Lädt…</p>;

  const initials = (profile.displayName || profile.email)
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="mx-auto max-w-lg space-y-10">
      <h1 className="text-2xl font-bold">{tNav('profile')}</h1>

      {/* --- Profilbild --- */}
      <section className="flex items-center gap-5">
        {avatarSrc(profile.avatarUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarSrc(profile.avatarUrl) as string} alt="" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-600 text-2xl font-bold text-white">
            {initials}
          </span>
        )}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary"
            disabled={avatarUploading}
          >
            {avatarUploading ? tCommon('loading') : t('changeAvatar')}
          </button>
          <p className="mt-1 text-xs text-[rgb(var(--foreground))]/50">{t('avatarHint')}</p>
          {avatarMsg && <p className="mt-1 text-sm">{avatarMsg}</p>}
        </div>
      </section>

      {/* --- Profildaten --- */}
      <section>
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
      </section>

      {/* --- Passwort wechseln --- */}
      <section className="border-t border-[rgb(var(--border))] pt-6">
        <h2 className="mb-4 font-semibold">{t('changePasswordTitle')}</h2>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{t('currentPassword')}</label>
            <input
              type="password"
              className="input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('resetNewPassword')}</label>
            <input
              type="password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('confirmPassword')}</label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {pwError && <p className="text-sm text-red-600">✗ {pwError}</p>}
          {pwMsg && <p className="text-sm text-green-600">{pwMsg}</p>}
          <button type="submit" className="btn-primary w-full" disabled={pwSaving}>
            {pwSaving ? tCommon('loading') : t('changePasswordTitle')}
          </button>
        </form>
      </section>

      {/* --- Konto löschen --- */}
      <section className="border-t border-[rgb(var(--border))] pt-6">
        <h2 className="mb-2 font-semibold text-red-600">{t('deleteAccountTitle')}</h2>
        <p className="mb-4 text-sm text-[rgb(var(--foreground))]/70">{t('deleteAccountDesc')}</p>
        <button onClick={deleteAccount} className="btn-secondary text-red-600">
          {t('deleteAccountTitle')}
        </button>
      </section>
    </div>
  );
}