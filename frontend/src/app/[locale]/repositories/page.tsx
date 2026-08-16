'use client';

// "Meine Lehrmittel": eigene Repositories + Mitgliedschaften.
// Erstellen mit vollständigen Metadaten (Fach, Stufe, Sprache, Lizenz …)
// und optionaler Zuordnung zu einem Master-Repository (Hierarchie).
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '../../../lib/api';
import { Link } from '../../../i18n/navigation';

type Subject = { id: number; key: string; labels: Record<string, string> };
type TagItem = { id: number; name: string };

type RepoListItem = {
  id: string;
  title: Record<string, string>;
  description: Record<string, string>;
  access: string;
  contentLanguage: string;
  updatedAt: string;
  isFork?: boolean;
  parentId?: string | null;
  owner: { displayName: string };
  _count?: { issues: number; pullRequestsTo: number };
};

const SCHOOL_LEVELS = ['KINDERGARTEN', 'PRIMARY', 'LOWER_SECONDARY', 'UPPER_SECONDARY', 'TERTIARY'];
const CONTENT_LANGUAGES = ['DE', 'FR', 'IT', 'RM', 'EN', 'OTHER'];
const MATERIAL_TYPES = ['worksheet', 'presentation', 'quiz', 'lessonPlan', 'reading', 'video', 'interactive', 'assessment', 'other'];
const LICENSES = ['CC-BY-SA', 'CC-BY', 'CC-BY-NC-SA', 'CC0', 'PD', 'internal'];

export default function MyRepositoriesPage() {
  const t = useTranslations('repo');
  const tMeta = useTranslations('repoMeta');
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [items, setItems] = useState<RepoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Kataloge
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);

  // Formular fuer neue Lehrmittel
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [access, setAccess] = useState<'PUBLIC_DOWNLOAD' | 'APPROVAL_REQUIRED'>('APPROVAL_REQUIRED');
  const [subjectId, setSubjectId] = useState<string>('');
  const [schoolLevel, setSchoolLevel] = useState('');
  const [contentLanguage, setContentLanguage] = useState('DE');
  const [materialType, setMaterialType] = useState('');
  const [educationSector, setEducationSector] = useState('');
  const [license, setLicense] = useState('');
  const [curriculum21, setCurriculum21] = useState('');
  const [targetGroup, setTargetGroup] = useState('');
  const [timeRequired, setTimeRequired] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [parentId, setParentId] = useState('');
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
    // Kataloge für Metadaten-Formular laden
    api.get<Subject[]>('/repositories/meta/subjects').then(setSubjects).catch(() => undefined);
    api.get<TagItem[]>('/repositories/meta/tags').then(setTags).catch(() => undefined);
  }, [load]);

  const toggleTag = (id: number) => {
    setSelectedTags((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const createRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/repositories', {
        title: { de: title },
        description: { de: description },
        access,
        subjectId: subjectId ? parseInt(subjectId, 10) : undefined,
        schoolLevel: schoolLevel || undefined,
        contentLanguage,
        materialType: materialType || undefined,
        educationSector: educationSector || undefined,
        license: license || undefined,
        curriculum21: curriculum21 || undefined,
        targetGroup: targetGroup || undefined,
        timeRequired: timeRequired || undefined,
        difficulty: difficulty || undefined,
        tagIds: selectedTags.length ? selectedTags : undefined,
        parentId: parentId || undefined,
      });
      setShowForm(false);
      setTitle('');
      setDescription('');
      setAccess('APPROVAL_REQUIRED');
      setSubjectId('');
      setSchoolLevel('');
      setContentLanguage('DE');
      setMaterialType('');
      setEducationSector('');
      setLicense('');
      setCurriculum21('');
      setTargetGroup('');
      setTimeRequired('');
      setDifficulty('');
      setSelectedTags([]);
      setParentId('');
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const repoTitle = (r: { title: Record<string, string> }) => r.title?.de || r.title?.en || Object.values(r.title || {})[0] || '—';

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
          {/* Pflichtfelder */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('title')} *</label>
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                minLength={2}
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

          <h3 className="pt-2 font-semibold">{tMeta('metadataTitle')}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('subject')}</label>
              <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">{tMeta('noSelection')}</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.labels?.de || s.key}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('schoolLevel')}</label>
              <select className="input" value={schoolLevel} onChange={(e) => setSchoolLevel(e.target.value)}>
                <option value="">{tMeta('noSelection')}</option>
                {SCHOOL_LEVELS.map((l) => (
                  <option key={l} value={l}>{tMeta(`levels.${l}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('language')}</label>
              <select className="input" value={contentLanguage} onChange={(e) => setContentLanguage(e.target.value)}>
                {CONTENT_LANGUAGES.map((l) => (
                  <option key={l} value={l}>{tMeta(`langs.${l}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{tMeta('materialType')}</label>
              <select className="input" value={materialType} onChange={(e) => setMaterialType(e.target.value)}>
                <option value="">{tMeta('noSelection')}</option>
                {MATERIAL_TYPES.map((mt) => (
                  <option key={mt} value={mt}>{tMeta(`types.${mt}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{tMeta('educationSector')}</label>
              <select className="input" value={educationSector} onChange={(e) => setEducationSector(e.target.value)}>
                <option value="">{tMeta('noSelection')}</option>
                <option value="GENERAL">{tMeta('sectors.GENERAL')}</option>
                <option value="VOCATIONAL">{tMeta('sectors.VOCATIONAL')}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('license')}</label>
              <select className="input" value={license} onChange={(e) => setLicense(e.target.value)}>
                <option value="">{tMeta('noSelection')}</option>
                {LICENSES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Pädagogische Metadaten */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">{tMeta('curriculum21')}</label>
              <input
                className="input"
                placeholder={tMeta('curriculum21Placeholder')}
                value={curriculum21}
                onChange={(e) => setCurriculum21(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{tMeta('targetGroup')}</label>
              <input
                className="input"
                placeholder={tMeta('targetGroupPlaceholder')}
                value={targetGroup}
                onChange={(e) => setTargetGroup(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{tMeta('timeRequired')}</label>
              <input
                className="input"
                placeholder={tMeta('timeRequiredPlaceholder')}
                value={timeRequired}
                onChange={(e) => setTimeRequired(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{tMeta('difficulty')}</label>
              <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="">{tMeta('noSelection')}</option>
                <option value="beginner">{tMeta('difficultyLevels.beginner')}</option>
                <option value="intermediate">{tMeta('difficultyLevels.intermediate')}</option>
                <option value="advanced">{tMeta('difficultyLevels.advanced')}</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium">{tMeta('tags')}</label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const active = selectedTags.includes(tag.id);
                  return (
                    <button
                      type="button"
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        active
                          ? 'bg-brand-600 text-white'
                          : 'bg-[rgb(var(--muted))] text-[rgb(var(--foreground))]/70 hover:opacity-80'
                      }`}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Hierarchie: Master-Repository wählen */}
          <div>
            <label className="mb-1 block text-sm font-medium">{tMeta('parentRepo')}</label>
            <select className="input" value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">{tMeta('noParent')}</option>
              {items.filter((r) => !r.parentId).map((r) => (
                <option key={r.id} value={r.id}>
                  {repoTitle(r)} {r.isFork ? '(Fork)' : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-[rgb(var(--foreground))]/50">{tMeta('parentRepoHint')}</p>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? tCommon('loading') : tCommon('save')}
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
                {item.parentId && <span className="mr-1 text-xs" aria-hidden>📦</span>}
                {repoTitle(item)}
              </h3>
              <p className="mb-3 line-clamp-2 text-sm text-[rgb(var(--foreground))]/70">
                {item.description?.de || item.description?.en || ''}
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded bg-[rgb(var(--muted))] px-2 py-1">
                  {item.contentLanguage}
                </span>
                <span className="rounded bg-[rgb(var(--muted))] px-2 py-1">
                  {item.access === 'PUBLIC_DOWNLOAD' ? t('publicDownload') : t('approvalRequired')}
                </span>
                {item.parentId && (
                  <span className="rounded bg-[rgb(var(--muted))] px-2 py-1">{tMeta('subRepoBadge')}</span>
                )}
                {(item._count?.issues ?? 0) > 0 && (
                  <span className="rounded bg-[rgb(var(--muted))] px-2 py-1">
                    🐛 {item._count?.issues}
                  </span>
                )}
                {(item._count?.pullRequestsTo ?? 0) > 0 && (
                  <span className="rounded bg-[rgb(var(--muted))] px-2 py-1">
                    🔀 {item._count?.pullRequestsTo}
                  </span>
                )}
              </div>
              <p className="mt-3 text-xs text-[rgb(var(--foreground))]/50">von {item.owner.displayName}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}