'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '../../../lib/api';

type User = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  createdAt: string;
};

export default function AdminPage() {
  const t = useTranslations('admin');
  const router = useRouter();
  const [pending, setPending] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  const approve = async (id: string) => {
    await api.post(`/users/${id}/approve`);
    load();
  };

  const reject = async (id: string) => {
    const reason = window.prompt('Grund der Ablehnung (optional):', '');
    await api.post(`/users/${id}/reject`, { reason });
    load();
  };

  const setStatus = async (id: string, status: string) => {
    await api.patch(`/users/${id}/status`, { status });
    load();
  };

  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-8">
      {/* Ausstehende Registrierungen */}
      <section>
        <h1 className="mb-4 text-2xl font-bold">{t('pendingUsers')} ({pending.length})</h1>
        {pending.length === 0 ? (
          <p className="text-sm text-[rgb(var(--foreground))]/60">Keine ausstehenden Registrierungen.</p>
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
                <th className="py-2">Name</th>
                <th className="py-2">E-Mail</th>
                <th className="py-2">Rolle</th>
                <th className="py-2">Status</th>
                <th className="py-2">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[rgb(var(--border))]/50">
                  <td className="py-2">{u.displayName}</td>
                  <td className="py-2">{u.email}</td>
                  <td className="py-2">{u.role}</td>
                  <td className="py-2">
                    <span className={`rounded px-2 py-1 text-xs ${
                      u.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-[rgb(var(--muted))]'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="py-2">
                    {u.role !== 'ADMIN' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => setStatus(u.id, 'LOCKED')}
                          className="rounded bg-[rgb(var(--muted))] px-2 py-1 text-xs hover:opacity-80"
                        >
                          {t('lock')}
                        </button>
                        <button
                          onClick={() => setStatus(u.id, 'DEACTIVATED')}
                          className="rounded bg-[rgb(var(--muted))] px-2 py-1 text-xs hover:opacity-80"
                        >
                          {t('deactivate')}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}