'use client';

// Lehrmittel-Detailseite im GitHub-Stil (MUI):
// - Übersicht mit Metadaten (editierbar für Mitglieder)
// - Dateien & Versionen inkl. Upload und neuer Versionen
// - Issues mit Kommentaren (Schliessen/Öffnen)
// - Pull Requests (erstellen, mergen, schliessen)
// - Mitglieder verwalten
// - Sub-Repositories (Hierarchie Master → Sub)
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  Link as MuiLink,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import EditIcon from '@mui/icons-material/Edit';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import MergeIcon from '@mui/icons-material/Merge';
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
  const [msgSeverity, setMsgSeverity] = useState<'success' | 'error'>('success');
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

  const flash = (text: string, ok: boolean) => {
    setMsgSeverity(ok ? 'success' : 'error');
    setMsg(text);
  };

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
    } catch (err: any) { flash('✗ ' + err.message, false); }
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
      flash('✓ ' + t('updated'), true);
      load();
    } catch (err: any) {
      flash('✗ ' + err.message, false);
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
      flash('✓ ' + t('versionCreated'), true);
      load();
    } catch (err: any) { flash('✗ ' + err.message, false); } finally { setBusy(false); }
  };

  const uploadFile = async (file: File) => {
    if (!uploadVersionId) return;
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.upload(`/repositories/${params.id}/versions/${uploadVersionId}/files`, formData);
      flash('✓ ' + t('fileUploaded', { name: file.name }), true);
      load();
    } catch (err: any) {
      flash('✗ ' + (err.message || 'Upload fehlgeschlagen.'), false);
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
    } catch (err: any) { flash('✗ ' + (err.message || 'Download fehlgeschlagen.'), false); }
  };

  const deleteFile = async (versionId: string, fileId: string) => {
    setBusy(true);
    try {
      await api.delete(`/repositories/${params.id}/versions/${versionId}/files/${fileId}`);
      load();
    } catch (err: any) { flash('✗ ' + err.message, false); } finally { setBusy(false); }
  };

  const fork = async () => {
    setBusy(true);
    try {
      const res = await api.post<{ id: string }>(`/repositories/${params.id}/fork`);
      router.push(`/repositories/${res.id}`);
    } catch (err: any) { flash('✗ ' + err.message, false); } finally { setBusy(false); }
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
    } catch (err: any) { flash('✗ ' + err.message, false); } finally { setBusy(false); }
  };

  const toggleIssue = async (issue: Issue) => {
    const close = issue.status === 'OPEN';
    try {
      await api.patch(`/repositories/${params.id}/issues/${issue.number}/${close ? 'close' : 'reopen'}`);
      loadIssues();
      if (openIssue?.number === issue.number) {
        setOpenIssue({ ...issue, status: close ? 'CLOSED' : 'OPEN' });
      }
    } catch (err: any) { flash('✗ ' + err.message, false); }
  };

  const openIssueDetail = async (number: number) => {
    try {
      const res = await api.get<Issue>(`/repositories/${params.id}/issues/${number}`);
      setOpenIssue(res);
    } catch (err: any) { flash('✗ ' + err.message, false); }
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
    } catch (err: any) { flash('✗ ' + err.message, false); }
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
    } catch (err: any) { flash('✗ ' + err.message, false); } finally { setBusy(false); }
  };

  const mergePr = async (pr: PullRequest) => {
    if (!window.confirm(tPrs('mergeConfirm', { number: pr.number }))) return;
    setBusy(true);
    try {
      await api.post(`/repositories/${params.id}/pull-requests/${pr.number}/merge`, {});
      loadPrs();
      load();
      flash('✓ ' + tPrs('merged'), true);
    } catch (err: any) { flash('✗ ' + err.message, false); } finally { setBusy(false); }
  };

  const closePr = async (pr: PullRequest) => {
    setBusy(true);
    try {
      await api.post(`/repositories/${params.id}/pull-requests/${pr.number}/close`, {});
      loadPrs();
    } catch (err: any) { flash('✗ ' + err.message, false); } finally { setBusy(false); }
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
    } catch (err: any) { flash('✗ ' + err.message, false); }
  };

  const removeMember = async (userId: string) => {
    try {
      await api.delete(`/repositories/${params.id}/members/${userId}`);
      load();
    } catch (err: any) { flash('✗ ' + err.message, false); }
  };

  const grantAccess = async (userId: string) => {
    try {
      await api.post(`/repositories/${params.id}/grant-access`, { userId });
      load();
    } catch (err: any) { flash('✗ ' + err.message, false); }
  };

  if (error) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">{error}</Alert>
        <Button component={Link} href="/repositories" variant="outlined">
          ← {t('backToMine')}
        </Button>
      </Stack>
    );
  }
  if (!repo) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

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

  const inputField = (
    key: string,
    label: string,
    opts?: { type?: string; options?: Array<[string, string]>; placeholder?: string; rows?: number },
  ) => {
    if (opts?.options) {
      return (
        <FormControl fullWidth key={key}>
          <InputLabel>{label}</InputLabel>
          <Select
            label={label}
            value={form[key] ?? ''}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          >
            {opts.options.map(([v, l]) => (
              <MenuItem key={v} value={v}>{l}</MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }
    if (opts?.rows) {
      return (
        <TextField
          key={key}
          label={label}
          multiline
          rows={opts.rows}
          placeholder={opts?.placeholder}
          value={form[key] ?? ''}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          fullWidth
        />
      );
    }
    return (
      <TextField
        key={key}
        label={label}
        type={opts?.type}
        placeholder={opts?.placeholder}
        value={form[key] ?? ''}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        fullWidth
      />
    );
  };

  return (
    <Stack spacing={3}>
      {/* Kopf */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          {/* Breadcrumb: Master → Sub */}
          <Box sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }} aria-label="breadcrumb">
            {repo.parent && (
              <>
                <Inventory2Icon fontSize="small" sx={{ color: 'text.secondary' }} />
                <MuiLink component={Link} href={`/repositories/${repo.parent.id}`} variant="caption" underline="hover">
                  {jsonTitle(repo.parent.title)}
                </MuiLink>
                <Typography variant="caption" color="text.secondary">/</Typography>
              </>
            )}
            {repo.isFork && repo.forkedFromId && (
              <>
                <CallSplitIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                <MuiLink component={Link} href={`/repositories/${repo.forkedFromId}`} variant="caption" underline="hover">
                  {t('fork')}
                </MuiLink>
                <Typography variant="caption" color="text.secondary">·</Typography>
              </>
            )}
          </Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            {repo.parentId && <Inventory2Icon sx={{ fontSize: 28, color: 'text.secondary' }} />}
            {repo.isFork && <CallSplitIcon sx={{ fontSize: 28, color: 'text.secondary' }} />}
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {repo.owner.displayName} · {new Date(repo.updatedAt).toLocaleDateString()}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Tooltip title={t('star')}>
            <Button onClick={toggleStar} variant="outlined" startIcon={starred ? <StarIcon /> : <StarBorderIcon />}>
              {starCount}
            </Button>
          </Tooltip>
          <Button onClick={fork} variant="outlined" disabled={busy} startIcon={<CallSplitIcon />}>
            {t('fork')}
          </Button>
          {isMember && !editMode && (
            <Button onClick={() => setEditMode(true)} variant="contained" startIcon={<EditIcon />}>
              {tCommon('edit')}
            </Button>
          )}
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v: Tab) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        {TABS.map((tb) => (
          <Tab
            key={tb.key}
            value={tb.key}
            label={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {tb.label}
                {tb.count !== undefined && tb.count > 0 && (
                  <Chip label={tb.count} size="small" sx={{ height: 18, fontSize: '0.7rem' }} />
                )}
              </span>
            }
            sx={{ minHeight: 44, textTransform: 'none', fontWeight: 500 }}
          />
        ))}
      </Tabs>

      {msg && <Alert severity={msgSeverity}>{msg}</Alert>}

      {/* =========================== Übersicht =========================== */}
      {tab === 'overview' && !editMode && (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{description || '—'}</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                <Chip size="small" label={repo.access === 'PUBLIC_DOWNLOAD' ? t('publicDownload') : t('approvalRequired')} />
                <Chip size="small" label={tMeta(`langs.${repo.contentLanguage}`)} />
                {repo.license && <Chip size="small" label={repo.license} />}
                {repo.schoolLevel && <Chip size="small" label={tMeta(`levels.${repo.schoolLevel}`)} />}
                {repo.subject?.labels?.de && <Chip size="small" label={repo.subject.labels.de} />}
                {repo.materialType && <Chip size="small" label={tMeta(`types.${repo.materialType}`)} />}
                {repo.educationSector && <Chip size="small" label={tMeta(`sectors.${repo.educationSector}`)} />}
                {repo.difficulty && <Chip size="small" label={tMeta(`difficultyLevels.${repo.difficulty}`)} />}
                {repo.tags?.map((tr) => (
                  <Chip key={tr.tag.id} size="small" label={`#${tr.tag.name}`} variant="outlined" />
                ))}
              </Box>
              {(repo.curriculum21 || repo.learningGoals || repo.targetGroup || repo.timeRequired || repo.methodology || repo.prerequisites) && (
                <>
                  <Divider />
                  <Stack spacing={0.5}>
                    {repo.curriculum21 && <Typography variant="body2"><strong>{tMeta('curriculum21')}:</strong> {repo.curriculum21}</Typography>}
                    {repo.learningGoals && <Typography variant="body2"><strong>{t('learningGoals')}:</strong> {repo.learningGoals}</Typography>}
                    {repo.targetGroup && <Typography variant="body2"><strong>{tMeta('targetGroup')}:</strong> {repo.targetGroup}</Typography>}
                    {repo.timeRequired && <Typography variant="body2"><strong>{tMeta('timeRequired')}:</strong> {repo.timeRequired}</Typography>}
                    {repo.methodology && <Typography variant="body2"><strong>{tMeta('methodology')}:</strong> {repo.methodology}</Typography>}
                    {repo.prerequisites && <Typography variant="body2"><strong>{tMeta('prerequisites')}:</strong> {repo.prerequisites}</Typography>}
                  </Stack>
                </>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* =========================== Bearbeiten =========================== */}
      {tab === 'overview' && editMode && (
        <Card variant="outlined">
          <CardContent>
            <form onSubmit={saveEdit}>
              <Stack spacing={2.5}>
                <Grid container spacing={2.5}>
                  <Grid item xs={12} md={6}>{inputField('titleDe', t('title'))}</Grid>
                  <Grid item xs={12} md={6}>
                    {inputField('access', t('access'), { options: [['PUBLIC_DOWNLOAD', t('publicDownload')], ['APPROVAL_REQUIRED', t('approvalRequired')]] })}
                  </Grid>
                </Grid>
                {inputField('descDe', t('description'), { rows: 3 })}
                <Typography variant="h6" component="h3" sx={{ pt: 1 }}>{tMeta('metadataTitle')}</Typography>
                <Grid container spacing={2.5}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>{t('subject')}</InputLabel>
                      <Select
                        label={t('subject')}
                        value={form.subjectId ?? ''}
                        onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                      >
                        <MenuItem value="">{tMeta('noSelection')}</MenuItem>
                        {subjects.map((s) => (
                          <MenuItem key={s.id} value={s.id}>{s.labels?.de || s.key}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    {inputField('schoolLevel', t('schoolLevel'), { options: [['', tMeta('noSelection')], ...SCHOOL_LEVELS.map((l) => [l, tMeta(`levels.${l}`)] as [string, string])] })}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    {inputField('contentLanguage', t('language'), { options: CONTENT_LANGUAGES.map((l) => [l, tMeta(`langs.${l}`)] as [string, string]) })}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    {inputField('materialType', tMeta('materialType'), { options: [['', tMeta('noSelection')], ...MATERIAL_TYPES.map((mt) => [mt, tMeta(`types.${mt}`)] as [string, string])] })}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    {inputField('educationSector', tMeta('educationSector'), { options: [['', tMeta('noSelection')], ['GENERAL', tMeta('sectors.GENERAL')], ['VOCATIONAL', tMeta('sectors.VOCATIONAL')]] })}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    {inputField('license', t('license'), { options: [['', tMeta('noSelection')], ...LICENSES.map((l) => [l, l] as [string, string])] })}
                  </Grid>
                  <Grid item xs={12} md={6}>
                    {inputField('difficulty', tMeta('difficulty'), { options: [['', tMeta('noSelection')], ['beginner', tMeta('difficultyLevels.beginner')], ['intermediate', tMeta('difficultyLevels.intermediate')], ['advanced', tMeta('difficultyLevels.advanced')]] })}
                  </Grid>
                </Grid>
                <Grid container spacing={2.5}>
                  <Grid item xs={12} md={6}>{inputField('curriculum21', tMeta('curriculum21'), { placeholder: tMeta('curriculum21Placeholder') })}</Grid>
                  <Grid item xs={12} md={6}>{inputField('targetGroup', tMeta('targetGroup'), { placeholder: tMeta('targetGroupPlaceholder') })}</Grid>
                  <Grid item xs={12} md={6}>{inputField('timeRequired', tMeta('timeRequired'), { placeholder: tMeta('timeRequiredPlaceholder') })}</Grid>
                </Grid>
                {inputField('learningGoals', t('learningGoals'), { rows: 2 })}
                {inputField('methodology', tMeta('methodology'), { rows: 2 })}
                {inputField('prerequisites', tMeta('prerequisites'), { rows: 2 })}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button type="submit" variant="contained" disabled={busy}>
                    {busy ? tCommon('loading') : tCommon('save')}
                  </Button>
                  <Button type="button" onClick={() => setEditMode(false)} variant="outlined">
                    {tCommon('cancel')}
                  </Button>
                </Box>
              </Stack>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ======================= Dateien & Versionen ======================= */}
      {tab === 'files' && (
        <Stack spacing={2.5}>
          {isMember && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" component="h3" sx={{ mb: 1.5 }}>{t('newVersionTitle')}</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                  <TextField
                    placeholder={t('changeNotePlaceholder')}
                    value={newVersionNote}
                    onChange={(e) => setNewVersionNote(e.target.value)}
                    sx={{ flex: 1, minWidth: 240 }}
                  />
                  <Button onClick={createVersion} variant="contained" disabled={busy} startIcon={<CallSplitIcon />}>
                    {t('newVersion')}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}
          {repo.versions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">{t('noVersions')}</Typography>
          ) : (
            <Stack spacing={2}>
              {repo.versions.map((v) => (
                <Card key={v.id} variant="outlined">
                  <CardContent>
                    <Box sx={{ mb: 1.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        v{v.version}
                        {v.changeNote && (
                          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1.5, fontWeight: 400 }}>
                            {v.changeNote}
                          </Typography>
                        )}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(v.createdAt).toLocaleString()}
                        </Typography>
                        {isMember && (
                          <>
                            <input
                              ref={fileInputRef}
                              type="file"
                              hidden
                              onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
                            />
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<UploadFileIcon />}
                              disabled={busy}
                              onClick={() => { setUploadVersionId(v.id); fileInputRef.current?.click(); }}
                            >
                              {t('upload')}
                            </Button>
                          </>
                        )}
                      </Box>
                    </Box>
                    {v.files.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">{t('noFiles')}</Typography>
                    ) : (
                      <Stack spacing={1}>
                        {v.files.map((f) => (
                          <Box
                            key={f.id}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 1.5,
                              borderRadius: 1,
                              bgcolor: 'action.hover',
                              px: 1.5,
                              py: 1,
                            }}
                          >
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                              <InsertDriveFileIcon fontSize="small" color="action" />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.originalName}</span>
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                              <Typography variant="caption" color="text.secondary">{formatBytes(Number(f.sizeBytes))}</Typography>
                              <Button size="small" variant="contained" onClick={() => downloadFile(v.id, f.id)} startIcon={<DownloadIcon />}>
                                {t('download')}
                              </Button>
                              {isMember && (
                                <IconButton size="small" color="error" onClick={() => deleteFile(v.id, f.id)} disabled={busy} aria-label={tCommon('delete')}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Box>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      )}

      {/* ============================= Issues ============================= */}
      {tab === 'issues' && (
        <Stack spacing={2.5}>
          {openIssue ? (
            <Stack spacing={2.5}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Box>
                  <Button
                    size="small"
                    onClick={() => setOpenIssue(null)}
                    startIcon={<ArrowBackIcon />}
                    sx={{ mb: 1, px: 0 }}
                  >
                    {tIssues('backToList')}
                  </Button>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
                    <Typography component="span" color="text.secondary" sx={{ mr: 1 }}>#{openIssue.number}</Typography>
                    {openIssue.title}
                  </Typography>
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="caption" color="text.secondary">
                      {openIssue.author.displayName} · {new Date(openIssue.createdAt).toLocaleString()}
                    </Typography>
                    <Chip
                      size="small"
                      color={openIssue.status === 'OPEN' ? 'success' : 'default'}
                      label={openIssue.status === 'OPEN' ? tIssues('open') : tIssues('closed')}
                    />
                  </Box>
                </Box>
                {isMember && (
                  <Button
                    variant="outlined"
                    color={openIssue.status === 'OPEN' ? 'error' : 'success'}
                    onClick={() => toggleIssue(openIssue)}
                  >
                    {openIssue.status === 'OPEN' ? tIssues('closeIssue') : tIssues('reopenIssue')}
                  </Button>
                )}
              </Box>
              {openIssue.description && (
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{openIssue.description}</Typography>
                  </CardContent>
                </Card>
              )}
              <Stack spacing={1.5}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {tIssues('comments')} ({openIssue.comments?.length ?? 0})
                </Typography>
                {(openIssue.comments ?? []).map((c) => (
                  <Card key={c.id} variant="outlined">
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                        {c.author.displayName} · {new Date(c.createdAt).toLocaleString()}
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{c.text}</Typography>
                    </CardContent>
                  </Card>
                ))}
                {isMember && (
                  <Card variant="outlined">
                    <CardContent>
                      <Stack spacing={1.5}>
                        <TextField
                          multiline
                          rows={2}
                          placeholder={tIssues('commentPlaceholder')}
                          value={issueComment}
                          onChange={(e) => setIssueComment(e.target.value)}
                          fullWidth
                        />
                        <Button onClick={() => addComment(openIssue.number)} variant="contained">
                          {tIssues('comment')}
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                )}
              </Stack>
            </Stack>
          ) : (
            <>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {(['', 'OPEN', 'CLOSED'] as const).map((f) => (
                    <Chip
                      key={f || 'all'}
                      label={f === '' ? tIssues('all') : f === 'OPEN' ? tIssues('open') : tIssues('closed')}
                      onClick={() => setIssueFilter(f)}
                      color={issueFilter === f ? 'primary' : 'default'}
                      variant={issueFilter === f ? 'filled' : 'outlined'}
                      size="small"
                    />
                  ))}
                </Box>
                {isMember && (
                  <Button onClick={() => setShowIssueForm(!showIssueForm)} variant="contained" size="small">
                    + {tIssues('new')}
                  </Button>
                )}
              </Box>

              <Collapse in={showIssueForm}>
                <Card variant="outlined">
                  <CardContent>
                    <form onSubmit={createIssue}>
                      <Stack spacing={2}>
                        <TextField
                          label={t('title')}
                          value={issueTitle}
                          onChange={(e) => setIssueTitle(e.target.value)}
                          required
                          slotProps={{ htmlInput: { minLength: 3 } }}
                          fullWidth
                        />
                        <TextField
                          label={t('description')}
                          multiline
                          rows={3}
                          value={issueDesc}
                          onChange={(e) => setIssueDesc(e.target.value)}
                          fullWidth
                        />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button type="submit" variant="contained" size="small" disabled={busy}>{tCommon('save')}</Button>
                          <Button type="button" onClick={() => setShowIssueForm(false)} variant="outlined" size="small">{tCommon('cancel')}</Button>
                        </Box>
                      </Stack>
                    </form>
                  </CardContent>
                </Card>
              </Collapse>

              {issues.length === 0 ? (
                <Typography variant="body2" color="text.secondary">{tIssues('empty')}</Typography>
              ) : (
                <Stack spacing={1.5}>
                  {issues
                    .filter((i) => !issueFilter || i.status === issueFilter)
                    .map((i) => (
                      <Card key={i.id} variant="outlined">
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 2, py: 1.5 }}>
                          <Button
                            onClick={() => openIssueDetail(i.number)}
                            sx={{ textAlign: 'left', minWidth: 0, flex: 1, display: 'block', px: 0 }}
                            disableRipple
                          >
                            <Typography variant="body1" sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                              {i.status === 'OPEN'
                                ? <RadioButtonCheckedIcon sx={{ fontSize: 16, color: 'success.main' }} />
                                : <CheckCircleIcon sx={{ fontSize: 16, color: 'text.disabled' }} />}
                              {i.title}
                              <Typography component="span" variant="body2" color="text.secondary">#{i.number}</Typography>
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              {i.author.displayName} · {new Date(i.createdAt).toLocaleDateString()} ·
                              <ChatBubbleOutlineIcon sx={{ fontSize: 13 }} /> {i._count?.comments ?? 0}
                            </Typography>
                          </Button>
                          {isMember && (
                            <Button
                              size="small"
                              variant="outlined"
                              color={i.status === 'OPEN' ? 'error' : 'success'}
                              onClick={() => toggleIssue(i)}
                            >
                              {i.status === 'OPEN' ? tIssues('closeIssue') : tIssues('reopenIssue')}
                            </Button>
                          )}
                        </Box>
                      </Card>
                    ))}
                </Stack>
              )}
            </>
          )}
        </Stack>
      )}

      {/* ========================= Pull Requests ========================= */}
      {tab === 'prs' && (
        <Stack spacing={2.5}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">{tPrs('hint')}</Typography>
            {isMember && (
              <Button onClick={() => setShowPrForm(!showPrForm)} variant="contained" size="small">
                + {tPrs('new')}
              </Button>
            )}
          </Box>

          <Collapse in={showPrForm}>
            <Card variant="outlined">
              <CardContent>
                <form onSubmit={createPr}>
                  <Stack spacing={2}>
                    <Box>
                      <FormControl fullWidth required>
                        <InputLabel>{tPrs('sourceRepo')}</InputLabel>
                        <Select label={tPrs('sourceRepo')} value={prSource} onChange={(e) => setPrSource(e.target.value)}>
                          <MenuItem value="">—</MenuItem>
                          {(repo.children ?? []).map((c) => (
                            <MenuItem key={c.id} value={c.id}>{jsonTitle(c.title)}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {tPrs('sourceRepoHint')}
                      </Typography>
                    </Box>
                    <TextField
                      label={t('title')}
                      value={prTitle}
                      onChange={(e) => setPrTitle(e.target.value)}
                      required
                      slotProps={{ htmlInput: { minLength: 3 } }}
                      fullWidth
                    />
                    <TextField
                      label={t('description')}
                      multiline
                      rows={3}
                      value={prDesc}
                      onChange={(e) => setPrDesc(e.target.value)}
                      fullWidth
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button type="submit" variant="contained" size="small" disabled={busy}>{tCommon('save')}</Button>
                      <Button type="button" onClick={() => setShowPrForm(false)} variant="outlined" size="small">{tCommon('cancel')}</Button>
                    </Box>
                  </Stack>
                </form>
              </CardContent>
            </Card>
          </Collapse>

          {prs.length === 0 ? (
            <Typography variant="body2" color="text.secondary">{tPrs('empty')}</Typography>
          ) : (
            <Stack spacing={1.5}>
              {prs.map((pr) => (
                <Card key={pr.id} variant="outlined">
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 2, py: 1.5 }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                        {pr.status === 'OPEN'
                          ? <RadioButtonCheckedIcon sx={{ fontSize: 16, color: 'success.main' }} />
                          : pr.status === 'MERGED'
                            ? <MergeIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
                            : <CheckCircleIcon sx={{ fontSize: 16, color: 'text.disabled' }} />}
                        {pr.title}
                        <Typography component="span" variant="body2" color="text.secondary">#{pr.number}</Typography>
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {jsonTitle(pr.sourceRepo.title)} → {jsonTitle(pr.targetRepo.title)} ·
                        {' '}{pr.author.displayName} · {new Date(pr.createdAt).toLocaleDateString()}
                        {pr.status === 'MERGED' && pr.mergedAt && ` · ${tPrs('merged')} ${new Date(pr.mergedAt).toLocaleDateString()}`}
                      </Typography>
                    </Box>
                    {isOwner && pr.status === 'OPEN' && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="contained"
                          color="secondary"
                          onClick={() => mergePr(pr)}
                          disabled={busy}
                          startIcon={<MergeIcon />}
                        >
                          {tPrs('merge')}
                        </Button>
                        <Button size="small" variant="outlined" onClick={() => closePr(pr)} disabled={busy}>
                          {tPrs('close')}
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      )}

      {/* ============================ Mitglieder ============================ */}
      {tab === 'members' && (
        <Stack spacing={2.5}>
          {isOwner && (
            <Card variant="outlined">
              <CardContent>
                <form onSubmit={addMember}>
                  <Stack spacing={1.5}>
                    <TextField
                      label={t('addMember')}
                      placeholder={t('memberUserIdPlaceholder')}
                      value={memberUserId}
                      onChange={(e) => setMemberUserId(e.target.value)}
                      required
                      fullWidth
                    />
                    <Typography variant="caption" color="text.secondary">{t('memberUserIdHint')}</Typography>
                    <Button type="submit" variant="contained" sx={{ alignSelf: 'flex-start' }}>{tCommon('save')}</Button>
                  </Stack>
                </form>
              </CardContent>
            </Card>
          )}
          <Card variant="outlined">
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              {repo.members.map((m, idx) => (
                <Box key={m.id}>
                  {idx > 0 && <Divider />}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 2, py: 1.25 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">{m.user.displayName}</Typography>
                      <Chip size="small" variant="outlined" label={m.role} />
                      {m.role !== 'OWNER' && !m.approved && (
                        <Chip size="small" color="warning" label="⏳" />
                      )}
                    </Box>
                    {isOwner && m.userId !== repo.ownerId && (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {!m.approved && (
                          <Button size="small" variant="outlined" color="success" onClick={() => grantAccess(m.userId)}>
                            ✓ {t('grantAccess')}
                          </Button>
                        )}
                        <IconButton size="small" color="error" onClick={() => removeMember(m.userId)} aria-label={tCommon('delete')}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* ======================== Sub-Repositories ======================== */}
      {tab === 'children' && (
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">{tMeta('childrenHint')}</Typography>
          {(repo.children ?? []).length === 0 ? (
            <Typography variant="body2" color="text.secondary">{tMeta('noChildren')}</Typography>
          ) : (
            <Stack spacing={1.5}>
              {(repo.children ?? []).map((c) => (
                <Card key={c.id} variant="outlined">
                  <CardActionArea component={Link} href={`/repositories/${c.id}`}>
                    <CardContent sx={{ py: 1.75 }}>
                      <Typography variant="body1" sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Inventory2Icon fontSize="small" color="action" />
                        {jsonTitle(c.title)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {c.owner.displayName} · {new Date(c.updatedAt).toLocaleDateString()}
                        {(c._count?.issues ?? 0) > 0 && ` · 🐛 ${c._count?.issues}`}
                        {(c._count?.stars ?? 0) > 0 && ` · ⭐ ${c._count?.stars}`}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>
      )}
    </Stack>
  );
}