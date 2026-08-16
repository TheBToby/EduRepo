'use client';

// Lehrmittel-Detailseite im GitHub-Stil:
// - Übersicht mit Metadaten (editierbar für Mitglieder)
// - Dateien & Versionen inkl. Upload und neuer Versionen
// - Issues mit Kommentaren (Schliessen/Öffnen)
// - Pull Requests (erstellen, mergen, schliessen)
// - Mitglieder verwalten
// - Sub-Repositories (Hierarchie Master → Sub)
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '../../../../lib/api';
import { Link } from '../../../../i18n/navigation';
import { useSession } from '../../../../components/SessionProvider';

type FileAsset = { id: string; originalName: string; mimeType: string; sizeBytes: string | number };
type Version = { id: string; version: number; changeNote?: string; createdAt: string; files: FileAsset[] };
type Member = { id: string; userId: string; role: string; approved: boolean; user: { id: string; displayName: string } };
type Subject = { id: number; key: string; labels: Record<string, string> };
type TagRef = { tag: { id: number; name: string } };

type Issue = {
  id: string; number: number; title: string; description?: string; status: 'OPEN' | 'CLOSED';
  labels: string[]; createdAt: string;
  author: { id: string; displayName: string; avatarUrl?: string | null };
  _count?: { comments: number };
  comments?: IssueComment[];
};
type IssueComment = { id: string; text: string; createdAt: string; author: { id: string; displayName: string; avatarUrl?: string | null } };

type PullRequest = {
  id: string; number: number; title: string; description?: string; status: 'OPEN' | 'MERGED' | 'CLOSED';
  createdAt: string; mergedAt?: string | null;
  author: { id: string; displayName: string; avatarUrl?: string | null };
  sourceRepo: { id: string; title: Record<string, string> };
  targetRepo: { id: string; title: Record<string, string> };
  mergedBy?: { id: string; displayName: string } | null;
};

type RepoDetail = {
  id: string;
  title: Record<string, string>;
  description: Record<string, string>;
  access: string;
  contentLanguage: string;
  license?: string | null;
  materialType?: string | null;
  educationSector?: string | null;
  subjectId?: number | null;
  subject?: Subject | null;
  schoolLevel?: string | null;
  curriculum21?: string | null;
  learningGoals?: string | null;
  targetGroup?: string | null;
  timeRequired?: string | null;
  difficulty?: string | null;
  methodology?: string | null;
  prerequisites?: string | null;
  isFork?: boolean;
  forkedFromId?: string | null;
  parentId?: string | null;
  parent?: { id: string; title: Record<string, string> } | null;
  children?: Array<{
    id: string; title: Record<string, string>; updatedAt: string;
    owner: { id: string; displayName: string; avatarUrl?: string | null };
    _count?: { issues: number; stars: number };
  }>;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  owner: { id: string; displayName: string };
  members: Member[];
  versions: Version[];
  tags?: TagRef[];
  stars?: { userId: string }[];
  _count?: { issues: number; pullRequestsTo: number };
};

const SCHOOL_LEVELS = ['KINDERGARTEN', 'PRIMARY', 'LOWER_SECONDARY', 'UPPER_SECONDARY', 'TERTIARY'];
const CONTENT_LANGUAGES = ['DE', 'FR', 'IT', 'RM', 'EN', 'OTHER'];
const MATERIAL_TYPES = ['worksheet', 'presentation', 'quiz', 'lessonPlan', 'reading', 'video', 'interactive', 'assessment', 'other'];
const LICENSES = ['CC-BY-SA', 'CC-BY', 'CC-BY-NC-SA', 'CC0', 'PD', 'internal'];

function formatBytes(bytes?: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const jsonTitle = (t?: Record<string, string> | null) =>
  t?.de || t?.en || Object.values(t || {})[0] || '—';

type Tab = 'overview' | 'files' | 'issues' | 'prs' | 'members' | 'children';

export default function RepositoryDetailPage() {
  const t = useTranslations('repo');
  const tMeta = useTranslations('repoMeta');
  const tIssues = useTranslations('repoIssues');
  const tPrs = useTranslations('repoPrs');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user } = useSession();

  const [repo, setRepo] = useState<RepoDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Sterne
  const [starred, setStarred] = useState(false);
  const [starCount, setStarCount] = useState(0);

  // Bearbeiten
  const [editMode, setEditMode] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});

  // Dateien/Versionen
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadVersionId, setUploadVersionId] = useState<string | null>(null);
  const [newVersionNote, setNewVersionNote] = useState('');

  // Issues
  const [issues, setIssues] = useState<Issue[]>([]);
  const [issueFilter, setIssueFilter] = useState<'OPEN' | 'CLOSED' | ''>('');
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDesc, setIssueDesc] = useState('');
  const [openIssue, setOpenIssue] = useState<Issue | null>(null);
  const [issueComment, setIssueComment] = useState('');

  // Pull Requests
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [showPrForm, setShowPrForm] = useState(false);
  const [prSource, setPrSource] = useState('');
  const [prTitle, setPrTitle] = useState('');
  const [prDesc, setPrDesc] = useState('');

  // Mitglieder
  const [memberUserId, setMemberUserId] = useState('');

  const isMember = !!repo && (repo.ownerId === user?.id || repo.members.some((m) => m.userId === user?.id));
  const isOwner = !!repo && repo.ownerId === user?.id;

  const load = useCallback(async () => {
    try {
      const res = await api.get<RepoDetail>(`/repositories/${params.id}`);
      setRepo(res);
      setStarCount(res.stars?.length ?? 0);
      setStarred(!!res.stars?.some((s) => s.userId === user?.id));
      // Formular mit aktuellen Werten füllen
      setForm({
        titleDe: res.title?.de || '',
        descDe: res.description?.de || '',
        access: res.access,
        subjectId: res.subjectId ? String(res.subjectId) : '',
        schoolLevel: res.schoolLevel || '',
        contentLanguage: res.contentLanguage,
        materialType: res.materialType || '',
        educationSector: res.educationSector || '',
        license: res.license || '',
        curriculum21: res.curriculum21 || '',
        learningGoals: res.learningGoals || '',
        targetGroup: res.targetGroup || '',
        timeRequired: res.timeRequired || '',
        difficulty: res.difficulty || '',
        methodology: res.methodology || '',
        prerequisites: res.prerequisites || '',
      });
    } catch (err: any) {
      if (err.status === 401) router.push('/login');
      else setError(err.message);
    }
  }, [params.id, router, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const loadIssues = useCallback(async () => {
    try {
      const res = await api.get<Issue[]>(`/repositories/${params.id}/issues`);
      setIssues(res);
    } catch { setIssues([]); }
  }, [params.id]);

  const loadPrs = useCallback(async () => {
    try {
      const res = await api.get<PullRequest[]>(`/repositories/${params.id}/pull-requests`);
      setPrs(res);
    } catch { setPrs([]); }
  }, [params.id]);

  useEffect(() => {
    if (tab === 'issues') loadIssues();
    if (tab === 'prs') loadPrs();
  }, [tab, loadIssues, loadPrs]);

  useEffect(() => {
    if (editMode && subjects.length === 0) {
      api.get<Subject[]>('/repositories/meta/subjects').then(setSubjects).catch(() => undefined);
    }
  }, [editMode, subjects.length]);

  // --- Aktionen ---
  const toggleStar = async () => {
    try {
      const res = await api.post<{ starred: boolean; stars: number }>(`/repositories/${params.id}/star`);
      setStarred(res.starred);
      setStarCount(res.stars);
    } catch (err: any) { setMsg('✗ ' + err.message); }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api.patch(`/repositories/${params.id}`, {
        title: { de: form.titleDe },
        description: { de: form.descDe },
        access: form.access,
        subjectId: form.subjectId ? parseInt(form.subjectId, 10) : null,
        schoolLevel: form.schoolLevel || null,
        contentLanguage: form.contentLanguage,
        materialType: form.materialType || null,
        educationSector: form.educationSector || null,
        license: form.license || null,
        curriculum21: form.curriculum21 || null,
        learningGoals: form.learningGoals || null,
        targetGroup: form.targetGroup || null,
        timeRequired: form.timeRequired || null,
        difficulty: form.difficulty || null,
        methodology: form.methodology || null,
        prerequisites: form.prerequisites || null,
      });
      setEditMode(false);
      setMsg('✓ ' + t('updated'));
      load();
    } catch (err: any) {
      setMsg('✗ ' + err.message);
    } finally {
      setBusy(false);
    }
  };

  const createVersion = async () => {
    setBusy(true);
    try {
      await api.post(`/repositories/${params.id}/versions`, {
        changeNote: newVersionNote || undefined,
      });
      setNewVersionNote('');
      setMsg('✓ ' + t('versionCreated'));
      load();
    } catch (err: any) { setMsg('✗ ' + err.message); } finally { setBusy(false); }
  };

  const uploadFile = async (file: File) => {
    if (!uploadVersionId) return;
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.upload(`/repositories/${params.id}/versions/${uploadVersionId}/files`, formData);
      setMsg('✓ ' + t('fileUploaded', { name: file.name }));
      load();
    } catch (err: any) {
      setMsg('✗ ' + (err.message || 'Upload fehlgeschlagen.'));
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadFile = async (versionId: string, fileId: string) => {
    try {
      const res = await api.get<{ url: string }>(
        `/repositories/${params.id}/versions/${versionId}/files/${fileId}/download`,
      );
      window.open(res.url, '_blank', 'noopener');
    } catch (err: any) { setMsg('✗ ' + (err.message || 'Download fehlgeschlagen.')); }
  };

  const deleteFile = async (versionId: string, fileId: string) => {
    setBusy(true);
    try {
      await api.delete(`/repositories/${params.id}/versions/${versionId}/files/${fileId}`);
      load();
    } catch (err: any) { setMsg('✗ ' + err.message); } finally { setBusy(false); }
  };

  const fork = async () => {
    setBusy(true);
    try {
      const res = await api.post<{ id: string }>(`/repositories/${params.id}/fork`);
      router.push(`/repositories/${res.id}`);
    } catch (err: any) { setMsg('✗ ' + err.message); } finally { setBusy(false); }
  };

  // Issues
  const createIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/repositories/${params.id}/issues`, {
        title: issueTitle,
        description: issueDesc || undefined,
      });
      setShowIssueForm(false);
      setIssueTitle('');
      setIssueDesc('');
      loadIssues();
      load();
    } catch (err: any) { setMsg('✗ ' + err.message); } finally { setBusy(false); }
  };

  const toggleIssue = async (issue: Issue) => {
    const close = issue.status === 'OPEN';
    try {
      await api.patch(`/repositories/${params.id}/issues/${issue.number}/${close ? 'close' : 'reopen'}`);
      loadIssues();
      if (openIssue?.number === issue.number) {
        setOpenIssue({ ...issue, status: close ? 'CLOSED' : 'OPEN' });
      }
    } catch (err: any) { setMsg('✗ ' + err.message); }
  };

  const openIssueDetail = async (number: number) => {
    try {
      const res = await api.get<Issue>(`/repositories/${params.id}/issues/${number}`);
      setOpenIssue(res);
    } catch (err: any) { setMsg('✗ ' + err.message); }
  };

  const addComment = async (number: number) => {
    if (!issueComment.trim()) return;
    try {
      const res = await api.post<IssueComment>(`/repositories/${params.id}/issues/${number}/comments`, {
        text: issueComment,
      });
      setIssueComment('');
      setOpenIssue((prev) =>
        prev ? { ...prev, comments: [...(prev.comments || []), res] } : prev,
      );
      loadIssues();
    } catch (err: any) { setMsg('✗ ' + err.message); }
  };

  // Pull Requests
  const createPr = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/repositories/${params.id}/pull-requests`, {
        sourceRepoId: prSource,
        title: prTitle,
        description: prDesc || undefined,
      });
      setShowPrForm(false);
      setPrSource('');
      setPrTitle('');
      setPrDesc('');
      loadPrs();
      load();
    } catch (err: any) { setMsg('✗ ' + err.message); } finally { setBusy(false); }
  };

  const mergePr = async (pr: PullRequest) => {
    if (!window.confirm(tPrs('mergeConfirm', { number: pr.number }))) return;
    setBusy(true);
    try {
      await api.post(`/repositories/${params.id}/pull-requests/${pr.number}/merge`, {});
      loadPrs();
      load();
      setMsg('✓ ' + tPrs('merged'));
    } catch (err: any) { setMsg('✗ ' + err.message); } finally { setBusy(false); }
  };

  const closePr = async (pr: PullRequest) => {
    setBusy(true);
    try {
      await api.post(`/repositories/${params.id}/pull-requests/${pr.number}/close`, {});
      loadPrs();
    } catch (err: any) { setMsg('✗ ' + err.message); } finally { setBusy(false); }
  };

  // Mitglieder
  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/repositories/${params.id}/members`, {
        userId: memberUserId,
        role: 'COLLABORATOR',
      });
      setMemberUserId('');
      load();
    } catch (err: any) { setMsg('✗ ' + err.message); }
  };

  const removeMember = async (userId: string) => {
    try {
      await api.delete(`/repositories/${params.id}/members/${userId}`);
      load();
    } catch (err: any) { setMsg('✗ ' + err.message); }
  };

  const grantAccess = async (userId: string) => {
    try {
      await api.post(`/repositories/${params.id}/grant-access`, { userId });
      load();
    } catch (err: any) { setMsg('✗ ' + err.message); }
  };

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">{error}</p>
        <Link href="/repositories" className="btn-secondary">← {t('backToMine')}</Link>
      </div>
    );
  }
  if (!repo) return <p>{tCommon('loading')}</p>;

  const title = jsonTitle(repo.title);
  const description = jsonTitle(repo.description);
  const openIssues = issues.filter((i) => i.status === 'OPEN').length || repo._count?.issues || 0;
  const openPrs = prs.filter((p) => p.status === 'OPEN').length || repo._count?.pullRequestsTo || 0;

  const TABS: Array<{ key: Tab; label: string; count?: number }> = [
    { key: 'overview', label: t('tabOverview') },
    { key: 'files', label: t('tabFiles'), count: repo.versions.length },
    { key: 'issues', label: t('tabIssues'), count: openIssues },
    { key: 'prs', label: t('tabPrs'), count: openPrs },
    { key: 'members', label: t('tabMembers'), count: repo.members.length },
    { key: 'children', label: t('tabChildren'), count: repo.children?.length ?? 0 },
  ];

  const inputField = (key: string, label: string, opts?: { type?: string; options?: Array<[string, string]>; placeholder?: string; rows?: number }) => (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {opts?.options ? (
        <select
          className="input"
          value={form[key] ?? ''}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        >
          {opts.options.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      ) : opts?.rows ? (
        <textarea
          className="input"
          rows={opts.rows}
          placeholder={opts?.placeholder}
          value={form[key] ?? ''}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        />
      ) : (
        <input
          className="input"
          type={opts?.type}
          placeholder={opts?.placeholder}
          value={form[key] ?? ''}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Kopf */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {/* Breadcrumb: Master → Sub */}
          <p className="mb-1 text-xs text-[rgb(var(--foreground))]/50">
            {repo.parent ? (
              <>
                📦 <Link href={`/repositories/${repo.parent.id}`} className="underline">{jsonTitle(repo.parent.title)}</Link>
                {' / '}
              </>
            ) : null}
            {repo.isFork && repo.forkedFromId && (
              <>
                🍴 <Link href={`/repositories/${repo.forkedFromId}`} className="underline">{t('fork')}</Link>
                {' · '}
              </>
            )}
          </p>
          <h1 className="text-2xl font-bold">
            {repo.parentId && <span className="mr-1 text-lg" aria-hidden>📦</span>}
            {repo.isFork && <span className="mr-1 text-lg" aria-hidden>🍴</span>}
            {title}
          </h1>
          <p className="mt-1 text-sm text-[rgb(var(--foreground))]/60">
            {repo.owner.displayName} · {new Date(repo.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={toggleStar} className="btn-secondary" title={t('star')}>
            {starred ? '⭐' : '☆'} {starCount}
          </button>
          <button onClick={fork} className="btn-secondary" disabled={busy}>
            🍴 {t('fork')}
          </button>
          {isMember && !editMode && (
            <button onClick={() => setEditMode(true)} className="btn-primary">
              ✏️ {tCommon('edit')}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-[rgb(var(--border))]">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`-mb-px rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === tb.key
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-[rgb(var(--foreground))]/60 hover:text-[rgb(var(--foreground))]'
            }`}
          >
            {tb.label}
            {tb.count !== undefined && tb.count > 0 && (
              <span className="ml-1 rounded-full bg-[rgb(var(--muted))] px-1.5 text-xs">{tb.count}</span>
            )}
          </button>
        ))}
      </div>

      {msg && <p className="text-sm">{msg}</p>}

      {/* =========================== Übersicht =========================== */}
      {tab === 'overview' && !editMode && (
        <section className="card space-y-3">
          <p className="whitespace-pre-wrap text-sm">{description || '—'}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded bg-[rgb(var(--muted))] px-2 py-1">
              {repo.access === 'PUBLIC_DOWNLOAD' ? t('publicDownload') : t('approvalRequired')}
            </span>
            <span className="rounded bg-[rgb(var(--muted))] px-2 py-1">{tMeta(`langs.${repo.contentLanguage}`)}</span>
            {repo.license && <span className="rounded bg-[rgb(var(--muted))] px-2 py-1">{repo.license}</span>}
            {repo.schoolLevel && <span className="rounded bg-[rgb(var(--muted))] px-2 py-1">{tMeta(`levels.${repo.schoolLevel}`)}</span>}
            {repo.subject?.labels?.de && <span className="rounded bg-[rgb(var(--muted))] px-2 py-1">{repo.subject.labels.de}</span>}
            {repo.materialType && <span className="rounded bg-[rgb(var(--muted))] px-2 py-1">{tMeta(`types.${repo.materialType}`)}</span>}
            {repo.educationSector && <span className="rounded bg-[rgb(var(--muted))] px-2 py-1">{tMeta(`sectors.${repo.educationSector}`)}</span>}
            {repo.difficulty && <span className="rounded bg-[rgb(var(--muted))] px-2 py-1">{tMeta(`difficultyLevels.${repo.difficulty}`)}</span>}
            {repo.tags?.map((tr) => (
              <span key={tr.tag.id} className="rounded bg-[rgb(var(--muted))] px-2 py-1">#{tr.tag.name}</span>
            ))}
          </div>
          {(repo.curriculum21 || repo.learningGoals || repo.targetGroup || repo.timeRequired || repo.methodology || repo.prerequisites) && (
            <div className="space-y-1 border-t border-[rgb(var(--border))] pt-3 text-sm">
              {repo.curriculum21 && <p><span className="font-medium">{tMeta('curriculum21')}:</span> {repo.curriculum21}</p>}
              {repo.learningGoals && <p><span className="font-medium">{t('learningGoals')}:</span> {repo.learningGoals}</p>}
              {repo.targetGroup && <p><span className="font-medium">{tMeta('targetGroup')}:</span> {repo.targetGroup}</p>}
              {repo.timeRequired && <p><span className="font-medium">{tMeta('timeRequired')}:</span> {repo.timeRequired}</p>}
              {repo.methodology && <p><span className="font-medium">{tMeta('methodology')}:</span> {repo.methodology}</p>}
              {repo.prerequisites && <p><span className="font-medium">{tMeta('prerequisites')}:</span> {repo.prerequisites}</p>}
            </div>
          )}
        </section>
      )}

      {/* =========================== Bearbeiten =========================== */}
      {tab === 'overview' && editMode && (
        <form onSubmit={saveEdit} className="card space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {inputField('titleDe', t('title'))}
            {inputField('access', t('access'), { options: [['PUBLIC_DOWNLOAD', t('publicDownload')], ['APPROVAL_REQUIRED', t('approvalRequired')]] })}
          </div>
          {inputField('descDe', t('description'), { rows: 3 })}
          <h3 className="pt-2 font-semibold">{tMeta('metadataTitle')}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('subject')}</label>
              <select className="input" value={form.subjectId ?? ''} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
                <option value="">{tMeta('noSelection')}</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.labels?.de || s.key}</option>
                ))}
              </select>
            </div>
            {inputField('schoolLevel', t('schoolLevel'), { options: [['', tMeta('noSelection')], ...SCHOOL_LEVELS.map((l) => [l, tMeta(`levels.${l}`)] as [string, string])] })}
            {inputField('contentLanguage', t('language'), { options: CONTENT_LANGUAGES.map((l) => [l, tMeta(`langs.${l}`)] as [string, string]) })}
            {inputField('materialType', tMeta('materialType'), { options: [['', tMeta('noSelection')], ...MATERIAL_TYPES.map((mt) => [mt, tMeta(`types.${mt}`)] as [string, string])] })}
            {inputField('educationSector', tMeta('educationSector'), { options: [['', tMeta('noSelection')], ['GENERAL', tMeta('sectors.GENERAL')], ['VOCATIONAL', tMeta('sectors.VOCATIONAL')]] })}
            {inputField('license', t('license'), { options: [['', tMeta('noSelection')], ...LICENSES.map((l) => [l, l] as [string, string])] })}
            {inputField('difficulty', tMeta('difficulty'), { options: [['', tMeta('noSelection')], ['beginner', tMeta('difficultyLevels.beginner')], ['intermediate', tMeta('difficultyLevels.intermediate')], ['advanced', tMeta('difficultyLevels.advanced')]] })}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {inputField('curriculum21', tMeta('curriculum21'), { placeholder: tMeta('curriculum21Placeholder') })}
            {inputField('targetGroup', tMeta('targetGroup'), { placeholder: tMeta('targetGroupPlaceholder') })}
            {inputField('timeRequired', tMeta('timeRequired'), { placeholder: tMeta('timeRequiredPlaceholder') })}
          </div>
          {inputField('learningGoals', t('learningGoals'), { rows: 2 })}
          {inputField('methodology', tMeta('methodology'), { rows: 2 })}
          {inputField('prerequisites', tMeta('prerequisites'), { rows: 2 })}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? tCommon('loading') : tCommon('save')}
            </button>
            <button type="button" onClick={() => setEditMode(false)} className="btn-secondary">
              {tCommon('cancel')}
            </button>
          </div>
        </form>
      )}

      {/* ======================= Dateien & Versionen ======================= */}
      {tab === 'files' && (
        <section className="space-y-4">
          {isMember && (
            <div className="card space-y-3">
              <h3 className="font-semibold">{t('newVersionTitle')}</h3>
              <div className="flex flex-wrap gap-2">
                <input
                  className="input flex-1"
                  placeholder={t('changeNotePlaceholder')}
                  value={newVersionNote}
                  onChange={(e) => setNewVersionNote(e.target.value)}
                />
                <button onClick={createVersion} className="btn-primary" disabled={busy}>
                  + {t('newVersion')}
                </button>
              </div>
            </div>
          )}
          {repo.versions.length === 0 ? (
            <p className="text-sm text-[rgb(var(--foreground))]/60">{t('noVersions')}</p>
          ) : (
            <div className="space-y-3">
              {repo.versions.map((v) => (
                <div key={v.id} className="card">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      v{v.version}
                      {v.changeNote && (
                        <span className="ml-2 text-sm font-normal text-[rgb(var(--foreground))]/60">{v.changeNote}</span>
                      )}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-[rgb(var(--foreground))]/50">
                        {new Date(v.createdAt).toLocaleString()}
                      </p>
                      {isMember && (
                        <>
                          <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
                          />
                          <button
                            onClick={() => { setUploadVersionId(v.id); fileInputRef.current?.click(); }}
                            className="rounded bg-brand-600 px-2 py-1 text-xs text-white hover:opacity-90"
                            disabled={busy}
                          >
                            ⬆ {t('upload')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {v.files.length === 0 ? (
                    <p className="text-sm text-[rgb(var(--foreground))]/60">{t('noFiles')}</p>
                  ) : (
                    <ul className="space-y-1">
                      {v.files.map((f) => (
                        <li key={f.id} className="flex items-center justify-between gap-2 rounded bg-[rgb(var(--muted))]/50 px-3 py-2 text-sm">
                          <span className="min-w-0 truncate">📄 {f.originalName}</span>
                          <span className="flex shrink-0 items-center gap-3">
                            <span className="text-xs text-[rgb(var(--foreground))]/50">{formatBytes(Number(f.sizeBytes))}</span>
                            <button
                              onClick={() => downloadFile(v.id, f.id)}
                              className="rounded bg-brand-600 px-2 py-1 text-xs text-white hover:opacity-90"
                            >
                              {t('download')}
                            </button>
                            {isMember && (
                              <button
                                onClick={() => deleteFile(v.id, f.id)}
                                className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:opacity-80"
                                disabled={busy}
                              >
                                ✕
                              </button>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ============================= Issues ============================= */}
      {tab === 'issues' && (
        <section className="space-y-4">
          {openIssue ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <button onClick={() => setOpenIssue(null)} className="mb-2 text-sm text-brand-600 hover:underline">
                    ← {tIssues('backToList')}
                  </button>
                  <h2 className="text-xl font-bold">
                    <span className="mr-2 text-[rgb(var(--foreground))]/50">#{openIssue.number}</span>
                    {openIssue.title}
                  </h2>
                  <p className="mt-1 text-xs text-[rgb(var(--foreground))]/60">
                    {openIssue.author.displayName} · {new Date(openIssue.createdAt).toLocaleString()} ·
                    <span className={`ml-1 rounded px-1.5 py-0.5 text-xs ${
                      openIssue.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-[rgb(var(--muted))]'
                    }`}>
                      {openIssue.status === 'OPEN' ? tIssues('open') : tIssues('closed')}
                    </span>
                  </p>
                </div>
                {isMember && (
                  <button
                    onClick={() => toggleIssue(openIssue)}
                    className={`btn-secondary text-sm ${openIssue.status === 'OPEN' ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {openIssue.status === 'OPEN' ? tIssues('closeIssue') : tIssues('reopenIssue')}
                  </button>
                )}
              </div>
              {openIssue.description && (
                <p className="card whitespace-pre-wrap text-sm">{openIssue.description}</p>
              )}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">
                  {tIssues('comments')} ({openIssue.comments?.length ?? 0})
                </h3>
                {(openIssue.comments ?? []).map((c) => (
                  <div key={c.id} className="card py-2 text-sm">
                    <p className="mb-1 text-xs text-[rgb(var(--foreground))]/50">
                      {c.author.displayName} · {new Date(c.createdAt).toLocaleString()}
                    </p>
                    <p className="whitespace-pre-wrap">{c.text}</p>
                  </div>
                ))}
                {isMember && (
                  <div className="card space-y-2">
                    <textarea
                      className="input"
                      rows={2}
                      placeholder={tIssues('commentPlaceholder')}
                      value={issueComment}
                      onChange={(e) => setIssueComment(e.target.value)}
                    />
                    <button onClick={() => addComment(openIssue.number)} className="btn-primary text-sm">
                      {tIssues('comment')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-1">
                  {(['', 'OPEN', 'CLOSED'] as const).map((f) => (
                    <button
                      key={f || 'all'}
                      onClick={() => setIssueFilter(f)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                        issueFilter === f
                          ? 'bg-brand-600 text-white'
                          : 'bg-[rgb(var(--muted))] text-[rgb(var(--foreground))]/70 hover:opacity-80'
                      }`}
                    >
                      {f === '' ? tIssues('all') : f === 'OPEN' ? tIssues('open') : tIssues('closed')}
                    </button>
                  ))}
                </div>
                {isMember && (
                  <button onClick={() => setShowIssueForm(!showIssueForm)} className="btn-primary text-sm">
                    + {tIssues('new')}
                  </button>
                )}
              </div>

              {showIssueForm && (
                <form onSubmit={createIssue} className="card space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">{t('title')}</label>
                    <input className="input" value={issueTitle} onChange={(e) => setIssueTitle(e.target.value)} required minLength={3} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">{t('description')}</label>
                    <textarea className="input" rows={3} value={issueDesc} onChange={(e) => setIssueDesc(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary text-sm" disabled={busy}>{tCommon('save')}</button>
                    <button type="button" onClick={() => setShowIssueForm(false)} className="btn-secondary text-sm">{tCommon('cancel')}</button>
                  </div>
                </form>
              )}

              {issues.length === 0 ? (
                <p className="text-sm text-[rgb(var(--foreground))]/60">{tIssues('empty')}</p>
              ) : (
                <ul className="space-y-2">
                  {issues
                    .filter((i) => !issueFilter || i.status === issueFilter)
                    .map((i) => (
                      <li key={i.id} className="card flex flex-wrap items-center justify-between gap-2 py-3">
                        <button onClick={() => openIssueDetail(i.number)} className="min-w-0 flex-1 text-left">
                          <p className="font-medium">
                            <span className={`mr-2 ${i.status === 'OPEN' ? 'text-green-600' : 'text-[rgb(var(--foreground))]/40'}`}>
                              {i.status === 'OPEN' ? '●' : '✔'}
                            </span>
                            {i.title}
                            <span className="ml-2 text-sm text-[rgb(var(--foreground))]/50">#{i.number}</span>
                          </p>
                          <p className="text-xs text-[rgb(var(--foreground))]/50">
                            {i.author.displayName} · {new Date(i.createdAt).toLocaleDateString()} ·
                            {' 💬 '}{i._count?.comments ?? 0}
                          </p>
                        </button>
                        {isMember && (
                          <button
                            onClick={() => toggleIssue(i)}
                            className={`rounded px-2 py-1 text-xs ${
                              i.status === 'OPEN' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {i.status === 'OPEN' ? tIssues('closeIssue') : tIssues('reopenIssue')}
                          </button>
                        )}
                      </li>
                    ))}
                </ul>
              )}
            </>
          )}
        </section>
      )}

      {/* ========================= Pull Requests ========================= */}
      {tab === 'prs' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[rgb(var(--foreground))]/60">{tPrs('hint')}</p>
            {isMember && (
              <button onClick={() => setShowPrForm(!showPrForm)} className="btn-primary text-sm">
                + {tPrs('new')}
              </button>
            )}
          </div>

          {showPrForm && (
            <form onSubmit={createPr} className="card space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">{tPrs('sourceRepo')}</label>
                <select className="input" value={prSource} onChange={(e) => setPrSource(e.target.value)} required>
                  <option value="">—</option>
                  {(repo.children ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{jsonTitle(c.title)}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-[rgb(var(--foreground))]/50">{tPrs('sourceRepoHint')}</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t('title')}</label>
                <input className="input" value={prTitle} onChange={(e) => setPrTitle(e.target.value)} required minLength={3} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t('description')}</label>
                <textarea className="input" rows={3} value={prDesc} onChange={(e) => setPrDesc(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary text-sm" disabled={busy}>{tCommon('save')}</button>
                <button type="button" onClick={() => setShowPrForm(false)} className="btn-secondary text-sm">{tCommon('cancel')}</button>
              </div>
            </form>
          )}

          {prs.length === 0 ? (
            <p className="text-sm text-[rgb(var(--foreground))]/60">{tPrs('empty')}</p>
          ) : (
            <ul className="space-y-2">
              {prs.map((pr) => (
                <li key={pr.id} className="card flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      <span className={`mr-2 ${
                        pr.status === 'OPEN' ? 'text-green-600' : pr.status === 'MERGED' ? 'text-purple-600' : 'text-[rgb(var(--foreground))]/40'
                      }`}>
                        {pr.status === 'OPEN' ? '●' : pr.status === 'MERGED' ? '◎' : '✔'}
                      </span>
                      {pr.title}
                      <span className="ml-2 text-sm text-[rgb(var(--foreground))]/50">#{pr.number}</span>
                    </p>
                    <p className="text-xs text-[rgb(var(--foreground))]/50">
                      {jsonTitle(pr.sourceRepo.title)} → {jsonTitle(pr.targetRepo.title)} ·
                      {' '}{pr.author.displayName} · {new Date(pr.createdAt).toLocaleDateString()}
                      {pr.status === 'MERGED' && pr.mergedAt && ` · ${tPrs('merged')} ${new Date(pr.mergedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  {isOwner && pr.status === 'OPEN' && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => mergePr(pr)}
                        className="rounded bg-purple-100 px-2 py-1 text-xs text-purple-700 hover:opacity-80"
                        disabled={busy}
                      >
                        ⤵ {tPrs('merge')}
                      </button>
                      <button
                        onClick={() => closePr(pr)}
                        className="rounded bg-[rgb(var(--muted))] px-2 py-1 text-xs hover:opacity-80"
                        disabled={busy}
                      >
                        {tPrs('close')}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ============================ Mitglieder ============================ */}
      {tab === 'members' && (
        <section className="space-y-4">
          {isOwner && (
            <form onSubmit={addMember} className="card flex flex-wrap items-end gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">{t('addMember')}</label>
                <input
                  className="input"
                  placeholder={t('memberUserIdPlaceholder')}
                  value={memberUserId}
                  onChange={(e) => setMemberUserId(e.target.value)}
                  required
                />
                <p className="mt-1 text-xs text-[rgb(var(--foreground))]/50">{t('memberUserIdHint')}</p>
              </div>
              <button type="submit" className="btn-primary">{tCommon('save')}</button>
            </form>
          )}
          <ul className="card divide-y divide-[rgb(var(--border))]/50 text-sm">
            {repo.members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                <span>
                  {m.user.displayName}
                  <span className="ml-2 text-xs text-[rgb(var(--foreground))]/60">
                    {m.role}
                    {m.role !== 'OWNER' && !m.approved && ' (⏳)'}
                  </span>
                </span>
                {isOwner && m.userId !== repo.ownerId && (
                  <span className="flex gap-1">
                    {!m.approved && (
                      <button onClick={() => grantAccess(m.userId)} className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">
                        ✓ {t('grantAccess')}
                      </button>
                    )}
                    <button onClick={() => removeMember(m.userId)} className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">
                      ✕
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ======================== Sub-Repositories ======================== */}
      {tab === 'children' && (
        <section className="space-y-4">
          <p className="text-sm text-[rgb(var(--foreground))]/60">{tMeta('childrenHint')}</p>
          {(repo.children ?? []).length === 0 ? (
            <p className="text-sm text-[rgb(var(--foreground))]/60">{tMeta('noChildren')}</p>
          ) : (
            <ul className="space-y-2">
              {(repo.children ?? []).map((c) => (
                <li key={c.id}>
                  <Link href={`/repositories/${c.id}`} className="card block py-3 hover:border-brand-500">
                    <p className="font-medium">📦 {jsonTitle(c.title)}</p>
                    <p className="text-xs text-[rgb(var(--foreground))]/50">
                      {c.owner.displayName} · {new Date(c.updatedAt).toLocaleDateString()}
                      {(c._count?.issues ?? 0) > 0 && ` · 🐛 ${c._count?.issues}`}
                      {(c._count?.stars ?? 0) > 0 && ` · ⭐ ${c._count?.stars}`}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}