'use client';

// Profilseite: Profildaten, Profilbild-Upload, Angaben zum Lehrberuf
// (Ausbildung, Schulen, Kurz-CV, Fächer …) und Passwortwechsel.
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { api, ApiError } from '../../../lib/api';
import { useSession } from '../../../components/SessionProvider';
import { Avatar } from '../../../components/Avatar';

const SCHOOL_LEVELS = ['KINDERGARTEN', 'PRIMARY', 'LOWER_SECONDARY', 'UPPER_SECONDARY', 'TERTIARY'] as const;

type Profile = {
  id: string;
  displayName: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
  uiLanguage: 'DE' | 'FR' | 'IT' | 'EN';
  themePreference: 'LIGHT' | 'DARK' | 'SYSTEM';
  // Lehrberuf
  jobTitle?: string;
  education?: string;
  furtherEducation?: string;
  schools?: string[];
  curriculumVitae?: string;
  yearsOfExperience?: number | null;
  websiteUrl?: string;
  subjects?: string[];
  schoolLevels?: string[];
  educationSector?: 'GENERAL' | 'VOCATIONAL' | null;
};

export default function ProfilePage() {
  const t = useTranslations('auth');
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');
  const tProfile = useTranslations('teacherProfile');
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
      // Angaben zum Lehrberuf
      jobTitle: profile.jobTitle || undefined,
      education: profile.education || undefined,
      furtherEducation: profile.furtherEducation || undefined,
      schools: profile.schools || [],
      curriculumVitae: profile.curriculumVitae || undefined,
      yearsOfExperience: profile.yearsOfExperience ?? undefined,
      websiteUrl: profile.websiteUrl || undefined,
      subjects: profile.subjects || [],
      schoolLevels: profile.schoolLevels || [],
      educationSector: profile.educationSector || undefined,
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
  if (!profile) return <p>{tCommon('loading')}</p>;

  const toggleSchoolLevel = (level: string) => {
    setProfile((p) => {
      if (!p) return p;
      const current = p.schoolLevels || [];
      const next = current.includes(level)
        ? current.filter((l) => l !== level)
        : [...current, level];
      return { ...p, schoolLevels: next };
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <h1 className="text-2xl font-bold">{tNav('profile')}</h1>

      {/* --- Profilbild (mit Standardbild, falls keines hochgeladen) --- */}
      <section className="flex items-center gap-5">
        <Avatar avatarUrl={profile.avatarUrl} name={profile.displayName || profile.email} size={80} />
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
            <label className="mb-1 block text-sm font-medium">{tProfile('bio')}</label>
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
          {saved && <p className="text-sm text-green-600">✓ {tProfile('saved')}</p>}
          <button type="submit" className="btn-primary w-full">{tCommon('save')}</button>
        </form>
      </section>

      {/* --- Angaben zum Lehrberuf --- */}
      <section className="border-t border-[rgb(var(--border))] pt-6">
        <h2 className="mb-1 font-semibold">{tProfile('sectionTitle')}</h2>
        <p className="mb-4 text-sm text-[rgb(var(--foreground))]/60">{tProfile('sectionHint')}</p>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{tProfile('jobTitle')}</label>
            <input
              className="input"
              placeholder={tProfile('jobTitlePlaceholder')}
              value={profile.jobTitle || ''}
              onChange={(e) => setProfile({ ...profile, jobTitle: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{tProfile('education')}</label>
            <textarea
              className="input"
              rows={2}
              placeholder={tProfile('educationPlaceholder')}
              value={profile.education || ''}
              onChange={(e) => setProfile({ ...profile, education: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{tProfile('furtherEducation')}</label>
            <textarea
              className="input"
              rows={2}
              placeholder={tProfile('furtherEducationPlaceholder')}
              value={profile.furtherEducation || ''}
              onChange={(e) => setProfile({ ...profile, furtherEducation: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{tProfile('schools')}</label>
            <textarea
              className="input"
              rows={2}
              placeholder={tProfile('schoolsPlaceholder')}
              value={(profile.schools || []).join(', ')}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  schools: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })
              }
            />
            <p className="mt-1 text-xs text-[rgb(var(--foreground))]/50">{tProfile('listHint')}</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{tProfile('subjects')}</label>
            <textarea
              className="input"
              rows={2}
              placeholder={tProfile('subjectsPlaceholder')}
              value={(profile.subjects || []).join(', ')}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  subjects: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })
              }
            />
            <p className="mt-1 text-xs text-[rgb(var(--foreground))]/50">{tProfile('listHint')}</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{tProfile('schoolLevels')}</label>
            <div className="flex flex-wrap gap-2">
              {SCHOOL_LEVELS.map((level) => {
                const active = (profile.schoolLevels || []).includes(level);
                return (
                  <button
                    type="button"
                    key={level}
                    onClick={() => toggleSchoolLevel(level)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      active
                        ? 'bg-brand-600 text-white'
                        : 'bg-[rgb(var(--muted))] text-[rgb(var(--foreground))]/70 hover:opacity-80'
                    }`}
                  >
                    {tProfile(`levels.${level}`)}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{tProfile('educationSector')}</label>
            <select
              className="input"
              value={profile.educationSector || ''}
              onChange={(e) =>
                setProfile({ ...profile, educationSector: (e.target.value || undefined) as any })
              }
            >
              <option value="">{tProfile('noSelection')}</option>
              <option value="GENERAL">{tProfile('sectors.GENERAL')}</option>
              <option value="VOCATIONAL">{tProfile('sectors.VOCATIONAL')}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{tProfile('yearsOfExperience')}</label>
            <input
              type="number"
              min={0}
              max={80}
              className="input"
              placeholder="10"
              value={profile.yearsOfExperience ?? ''}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  yearsOfExperience: e.target.value === '' ? null : parseInt(e.target.value, 10),
                })
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{tProfile('curriculumVitae')}</label>
            <textarea
              className="input"
              rows={5}
              placeholder={tProfile('curriculumVitaePlaceholder')}
              value={profile.curriculumVitae || ''}
              onChange={(e) => setProfile({ ...profile, curriculumVitae: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{tProfile('websiteUrl')}</label>
            <input
              type="url"
              className="input"
              placeholder="https://…"
              value={profile.websiteUrl || ''}
              onChange={(e) => setProfile({ ...profile, websiteUrl: e.target.value })}
            />
          </div>
          {saved && <p className="text-sm text-green-600">✓ {tProfile('saved')}</p>}
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