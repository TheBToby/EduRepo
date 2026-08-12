'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '../../../lib/api';
import { Link } from '../../../i18n/navigation';

type RepoListItem = {
  id: string;
  title: Record<string, string>;
  description: Record<string, string>;
  access: string;
  contentLanguage: string;
  owner: { displayName: string };
};

export default function BrowsePage() {
  const t = useTranslations('repo');
  const tCommon = useTranslations('common');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<RepoListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ items: RepoListItem[] }>('/repositories');
      setItems(res.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    search();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <input
          className="input"
          placeholder={tCommon('search')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
        />
        <button onClick={search} className="btn-primary">{tCommon('search')}</button>
      </div>

      {loading ? (
        <p>{tCommon('loading')}</p>
      ) : items.length === 0 ? (
        <p className="text-[rgb(var(--foreground))]/60">Keine Lehrmittel gefunden.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link key={item.id} href={`/repositories/${item.id}`} className="card hover:border-brand-500">
              <h3 className="mb-2 font-semibold">{item.title.de || item.title.en || '—'}</h3>
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