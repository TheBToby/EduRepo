'use client';

// "Meine Lehrmittel": eigene Repositories + Mitgliedschaften.
// Ersetzt die vorherige 404-Seite (es gab keine /repositories-Route).
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '../../../lib/api';
import { Link } from '../../../i18n/navigation';

type RepoListItem = {
  id: string;
  title: Record<string, string>;
  description: Record<string, string>;
  access: string;
  contentLanguage: string;
  updatedAt: string;
  isFork?: boolean;
  owner: { displayName: string };
};

export default function MyRepositoriesPage() {
  const t = useTranslations('repo');
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [items, setItems] = useState<RepoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formular fuer neue Lehrmittel
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [access, setAccess] = useState<'PUBLIC_DOWNLOAD' | 'APPROVAL_REQUIRED'>('APPROVAL_REQUIRED');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ items: RepoListItem[] }>('/repositories?mine=true');
      setItems(res.items || []);
    } catch (err: any) {
      if (err.status === 401) router.push('/login');
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const createRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/repositories', {
        title: { de: title },
        description: { de: description },
        access,
      });
      setShowForm(false);
      setTitle('');
      setDescription('');
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{tNav('myRepos')}</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          + {t('create')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createRepo} className="card space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{t('title')}</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('description')}</label>
            <textarea
              className="input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('access')}</label>
            <select
              className="input"
              value={access}
              onChange={(e) => setAccess(e.target.value as any)}
            >
              <option value="PUBLIC_DOWNLOAD">{t('publicDownload')}</option>
              <option value="APPROVAL_REQUIRED">{t('approvalRequired')}</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {tCommon('save')}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              {tCommon('cancel')}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>{tCommon('loading')}</p>
      ) : items.length === 0 ? (
        <p className="text-[rgb(var(--foreground))]/60">{t('emptyMine')}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link key={item.id} href={`/repositories/${item.id}`} className="card hover:border-brand-500">
              <h3 className="mb-2 font-semibold">
                {item.isFork && <span className="mr-1 text-xs" aria-hidden>🍴</span>}
                {item.title.de || item.title.en || '—'}
              </h3>
              <p className="mb-3 line-clamp-2 text-sm text-[rgb(var(--foreground))]/70">
                {item.description.de || item.description.en || ''}
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded bg-[rgb(var(--muted))] px-2 py-1">
                  {item.contentLanguage}
                </span>
                <span className="rounded bg-[rgb(var(--muted))] px-2 py-1">
                  {item.access === 'PUBLIC_DOWNLOAD' ? t('publicDownload') : t('approvalRequired')}
                </span>
              </div>
              <p className="mt-3 text-xs text-[rgb(var(--foreground))]/50">von {item.owner.displayName}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}