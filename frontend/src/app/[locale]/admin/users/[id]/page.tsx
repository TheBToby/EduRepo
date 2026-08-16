'use client';

// Admin/Moderator: Nutzerprofil einsehen (Klick auf den Nutzernamen in der
// Nutzerverwaltung). Zeigt Stamm- und Lehrberufsdaten im Nur-Lese-Modus und
// bietet Schnellaktionen (Status ändern, löschen mit Kulanzfrist).
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '../../../../../lib/api';
import { Link } from '../../../../../i18n/navigation';
import { Avatar } from '../../../../../components/Avatar';

type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string;
  role: string;
  status: string;
  uiLanguage: string;
  provider: string;
  storageQuotaBytes?: string | number;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  deletedAt?: string | null;
  permanentDeleteAt?: string | null;
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

const SCHOOL_LEVELS = ['KINDERGARTEN', 'PRIMARY', 'LOWER_SECONDARY', 'UPPER_SECONDARY', 'TERTIARY'];

function formatBytes(bytes?: string | number | null): string {
  if (bytes === undefined || bytes === null) return '—';
  const n = Number(bytes);
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  return `${(n / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Verbleibende Kulanzfrist (Tage) berechnen; null wenn nicht gesetzt/abgelaufen. */
function retentionDaysLeft(permanentDeleteAt?: string | null): number | null {
  if (!permanentDeleteAt) return null;
  const diff = new Date(permanentDeleteAt).getTime() - Date.now();
  return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
}

export default function AdminUserPage() {
  const tAdmin = useTranslations('admin');
  const tProfile = useTranslations('teacherProfile');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<UserProfile>(`/users/${params.id}/profile`);
      setUser(res);
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) router.push('/login');
      else setError(err.message);
    }
  }, [params.id, router]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (status: 'ACTIVE' | 'LOCKED' | 'DEACTIVATED') => {
    setBusy(true);
    setMsg(null);
    try {
      await api.patch(`/users/${params.id}/status`, { status });
      setMsg('✓ ' + tAdmin('statusUpdated'));
      load();
    } catch (err: any) {
      setMsg('✗ ' + err.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteUser = async () => {
    const transfer = window.prompt(tAdmin('transferOwnershipPrompt'), '');
    if (transfer === null) return; // abgebrochen
    setBusy(true);
    setMsg(null);
    try {
      const res = await api.delete<{ permanentDeleteAt: string }>(`/users/${params.id}`, {
        body: {
          retentionDays: 30,
          ...(transfer ? { transferToUserId: transfer } : {}),
        },
      });
      setMsg('✓ ' + tAdmin('deleteScheduled', { date: new Date(res.permanentDeleteAt).toLocaleDateString() }));
      load();
    } catch (err: any) {
      setMsg('✗ ' + err.message);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <p className="text-red-600">{error}</p>;
  if (!user) return <p>{tCommon('loading')}</p>;

  const retentionLeft = retentionDaysLeft(user.permanentDeleteAt);

  const rows: Array<[string, string | undefined]> = [
    [tAdmin('email'), user.email],
    [tAdmin('role'), user.role],
    [tAdmin('status'), user.status],
    [tAdmin('provider'), user.provider],
    [tAdmin('uiLanguage'), user.uiLanguage],
    [tAdmin('quota'), formatBytes(user.storageQuotaBytes)],
    [tAdmin('createdAt'), new Date(user.createdAt).toLocaleString()],
    [tAdmin('lastLogin'), user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—'],
  ];

  const teacherRows: Array<[string, string | undefined]> = [
    [tProfile('jobTitle'), user.jobTitle],
    [tProfile('education'), user.education],
    [tProfile('furtherEducation'), user.furtherEducation],
    [tProfile('schools'), (user.schools || []).join(', ')],
    [tProfile('subjects'), (user.subjects || []).join(', ')],
    [tProfile('schoolLevels'), (user.schoolLevels || []).join(', ')],
    [tProfile('educationSector'), user.educationSector ? tProfile(`sectors.${user.educationSector}`) : undefined],
    [tProfile('yearsOfExperience'), user.yearsOfExperience != null ? String(user.yearsOfExperience) : undefined],
    [tProfile('websiteUrl'), user.websiteUrl],
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{tAdmin('userProfile')}</h1>
        <Link href="/admin" className="btn-secondary">← {tAdmin('backToUsers')}</Link>
      </div>

      {/* Kopf mit Avatar (Standard-Profilbild, falls keines vorhanden) */}
      <section className="card flex flex-wrap items-center gap-5">
        <Avatar
          avatarUrl={user.avatarUrl}
          name={user.displayName || user.email}
          size={72}
          endpoint={`/users/${user.id}/avatar`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold">{user.displayName}</h2>
            <span className={`rounded px-2 py-1 text-xs ${
              user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
            }`}>
              {user.status}
            </span>
            {retentionLeft !== null && (
              <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">
                {tAdmin('retentionRunning', { days: retentionLeft })}
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-[rgb(var(--foreground))]/60">{user.email}</p>
        </div>
        {/* Schnellaktionen */}
        {user.role !== 'ADMIN' && (
          <div className="flex flex-wrap gap-2">
            {user.status !== 'ACTIVE' && user.status !== 'SOFT_DELETED' && (
              <button onClick={() => setStatus('ACTIVE')} className="btn-primary text-sm" disabled={busy}>
                ✓ {tAdmin('activate')}
              </button>
            )}
            {user.status === 'ACTIVE' && (
              <>
                <button onClick={() => setStatus('LOCKED')} className="btn-secondary text-sm" disabled={busy}>
                  🔒 {tAdmin('lock')}
                </button>
                <button onClick={() => setStatus('DEACTIVATED')} className="btn-secondary text-sm" disabled={busy}>
                  ⏸ {tAdmin('deactivate')}
                </button>
                <button onClick={deleteUser} className="btn-secondary text-sm text-red-600" disabled={busy}>
                  🗑 {tAdmin('deleteUser')}
                </button>
              </>
            )}
          </div>
        )}
      </section>

      {msg && <p className="text-sm">{msg}</p>}

      {/* Stammdaten */}
      <section>
        <h3 className="mb-3 font-semibold">{tAdmin('accountData')}</h3>
        <dl className="card divide-y divide-[rgb(var(--border))]/50 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 px-4 py-2">
              <dt className="text-[rgb(var(--foreground))]/60">{label}</dt>
              <dd className="text-right font-medium">{value || '—'}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Lehrberuf */}
      <section>
        <h3 className="mb-3 font-semibold">{tProfile('sectionTitle')}</h3>
        <dl className="card divide-y divide-[rgb(var(--border))]/50 text-sm">
          {teacherRows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 px-4 py-2">
              <dt className="text-[rgb(var(--foreground))]/60">{label}</dt>
              <dd className="max-w-[60%] text-right font-medium">{value || '—'}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Bio & Kurz-CV */}
      {(user.bio || user.curriculumVitae) && (
        <section className="space-y-4">
          {user.bio && (
            <div>
              <h3 className="mb-2 font-semibold">{tProfile('bio')}</h3>
              <p className="card whitespace-pre-wrap text-sm">{user.bio}</p>
            </div>
          )}
          {user.curriculumVitae && (
            <div>
              <h3 className="mb-2 font-semibold">{tProfile('curriculumVitae')}</h3>
              <p className="card whitespace-pre-wrap text-sm">{user.curriculumVitae}</p>
            </div>
          )}
        </section>
      )}

      <p className="text-xs text-[rgb(var(--foreground))]/50">{tAdmin('readOnlyNotice')}</p>
    </div>
  );
}