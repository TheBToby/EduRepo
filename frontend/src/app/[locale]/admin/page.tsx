'use client';

// Admin-Bereich: Nutzer direkt anlegen (ohne Registrierungsanfrage),
// Registrierungen freigeben und Nutzer verwalten (aktivieren, sperren,
// deaktivieren, löschen mit Kulanzfrist, Profil einsehen).
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '../../../lib/api';
import { Link } from '../../../i18n/navigation';

type User = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  createdAt: string;
  deletedAt?: string | null;
  permanentDeleteAt?: string | null;
};

/** Verbleibende Kulanzfrist (Tage); null wenn keine läuft. */
function retentionDaysLeft(permanentDeleteAt?: string | null): number | null {
  if (!permanentDeleteAt) return null;
  const diff = new Date(permanentDeleteAt).getTime() - Date.now();
  return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
}

/** Farbklasse für Status-Badges inkl. laufender Kulanzfrist. */
function statusBadgeClass(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-100 text-green-700';
    case 'PENDING':
      return 'bg-blue-100 text-blue-700';
    case 'SOFT_DELETED':
      return 'bg-red-100 text-red-700';
    case 'LOCKED':
      return 'bg-orange-100 text-orange-700';
    case 'DEACTIVATED':
      return 'bg-gray-200 text-gray-700';
    default:
      return 'bg-[rgb(var(--muted))]';
  }
}

export default function AdminPage() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const tAuth = useTranslations('auth');
  const router = useRouter();
  const [pending, setPending] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Formular: neuen Nutzer anlegen
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'USER' | 'MODERATOR' | 'ADMIN'>('USER');
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  const load = async () => {
    try {
      const [p, u] = await Promise.all([
        api.get<User[]>('/users/pending'),
        api.get<User[]>('/users'),
      ]);
      setPending(p);
      setUsers(u);
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) router.push('/login');
      else setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateMsg(null);
    try {
      await api.post('/users', {
        email: newEmail,
        displayName: newName,
        password: newPassword || undefined,
        role: newRole,
      });
      setCreateMsg('✓ ' + t('userCreated', { email: newEmail }));
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      setNewRole('USER');
      load();
    } catch (err: any) {
      setCreateMsg('✗ ' + (err.message || 'Fehler.'));
    } finally {
      setCreating(false);
    }
  };

  const approve = async (id: string) => {
    await api.post(`/users/${id}/approve`);
    load();
  };

  const reject = async (id: string) => {
    const reason = window.prompt(t('rejectReasonPrompt'), '');
    if (reason === null) return;
    await api.post(`/users/${id}/reject`, { reason });
    load();
  };

  const setStatus = async (id: string, status: string) => {
    setBusyId(id);
    try {
      await api.patch(`/users/${id}/status`, { status });
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const deleteUserWithRetention = async (u: User) => {
    const confirmed = window.confirm(
      t('deleteConfirm', { name: u.displayName, days: 30 }),
    );
    if (!confirmed) return;
    const transfer = window.prompt(t('transferOwnershipPrompt'), '');
    if (transfer === null) return;
    setBusyId(u.id);
    try {
      const res = await api.delete<{ permanentDeleteAt: string }>(`/users/${u.id}`, {
        retentionDays: 30,
        ...(transfer ? { transferToUserId: transfer } : {}),
      });
      alert(t('deleteScheduled', { date: new Date(res.permanentDeleteAt).toLocaleDateString() }));
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const changeRole = async (id: string, role: string) => {
    await api.patch(`/users/${id}/role`, { role });
    load();
  };

  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-8">
      {/* Nutzer direkt anlegen */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('createUserTitle')}</h1>
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">
            + {t('createUser')}
          </button>
        </div>

        {showCreate && (
          <form onSubmit={createUser} className="card mb-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">{tAuth('registerName')}</label>
              <input
                className="input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                minLength={2}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{tAuth('registerEmail')}</label>
              <input
                type="email"
                className="input"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{tAuth('registerPassword')}</label>
              <input
                type="text"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('passwordOptional')}
                minLength={8}
              />
              <p className="mt-1 text-xs text-[rgb(var(--foreground))]/50">{t('passwordHint')}</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('setRole')}</label>
              <select
                className="input"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
              >
                <option value="USER">USER</option>
                <option value="MODERATOR">MODERATOR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            {createMsg && <p className="text-sm">{createMsg}</p>}
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={creating}>
                {creating ? tCommon('loading') : t('createUser')}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">
                {tCommon('cancel')}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Ausstehende Registrierungen */}
      <section>
        <h2 className="mb-4 text-xl font-bold">{t('pendingUsers')} ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-[rgb(var(--foreground))]/60">{t('noPending')}</p>
        ) : (
          <div className="space-y-2">
            {pending.map((u) => (
              <div key={u.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-medium">{u.displayName}</p>
                  <p className="text-sm text-[rgb(var(--foreground))]/60">{u.email}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approve(u.id)} className="btn-primary text-sm">
                    {t('approve')}
                  </button>
                  <button onClick={() => reject(u.id)} className="btn-secondary text-sm text-red-600">
                    {t('reject')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Alle Nutzer */}
      <section>
        <h2 className="mb-4 text-xl font-bold">{t('users')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgb(var(--border))] text-left">
                <th className="py-2">{tAuth('registerName')}</th>
                <th className="py-2">{tAuth('registerEmail')}</th>
                <th className="py-2">{t('setRole')}</th>
                <th className="py-2">{t('status')}</th>
                <th className="py-2">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const retention = retentionDaysLeft(u.permanentDeleteAt);
                return (
                  <tr key={u.id} className="border-b border-[rgb(var(--border))]/50">
                    {/* Klick auf Name => Profil des Nutzers */}
                    <td className="py-2">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="font-medium text-brand-600 hover:underline"
                      >
                        {u.displayName}
                      </Link>
                    </td>
                    <td className="py-2">{u.email}</td>
                    <td className="py-2">
                      {u.role === 'ADMIN' ? (
                        u.role
                      ) : (
                        <select
                          className="input py-1 text-xs"
                          value={u.role}
                          onChange={(e) => changeRole(u.id, e.target.value)}
                        >
                          <option value="USER">USER</option>
                          <option value="MODERATOR">MODERATOR</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      )}
                    </td>
                    <td className="py-2">
                      <div className="flex flex-col gap-1">
                        <span className={`rounded px-2 py-1 text-xs ${statusBadgeClass(u.status)}`}>
                          {u.status}
                        </span>
                        {/* Laufende Kulanzfrist anzeigen */}
                        {retention !== null && (
                          <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">
                            ⏳ {t('retentionRunning', { days: retention })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2">
                      {u.role !== 'ADMIN' && (
                        <div className="flex flex-wrap gap-1">
                          {(u.status === 'DEACTIVATED' || u.status === 'LOCKED') && (
                            <button
                              onClick={() => setStatus(u.id, 'ACTIVE')}
                              className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:opacity-80"
                              disabled={busyId === u.id}
                            >
                              ✓ {t('activate')}
                            </button>
                          )}
                          {u.status === 'ACTIVE' && (
                            <>
                              <button
                                onClick={() => setStatus(u.id, 'LOCKED')}
                                className="rounded bg-[rgb(var(--muted))] px-2 py-1 text-xs hover:opacity-80"
                                disabled={busyId === u.id}
                              >
                                🔒 {t('lock')}
                              </button>
                              <button
                                onClick={() => setStatus(u.id, 'DEACTIVATED')}
                                className="rounded bg-[rgb(var(--muted))] px-2 py-1 text-xs hover:opacity-80"
                                disabled={busyId === u.id}
                              >
                                ⏸ {t('deactivate')}
                              </button>
                              <button
                                onClick={() => deleteUserWithRetention(u)}
                                className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:opacity-80"
                                disabled={busyId === u.id}
                              >
                                🗑 {t('deleteUser')}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}