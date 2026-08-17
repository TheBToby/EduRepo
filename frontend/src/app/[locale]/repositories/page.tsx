'use client';

// "Meine Lehrmittel": eigene Repositories + Mitgliedschaften.
// Erstellen mit vollständigen Metadaten (Fach, Stufe, Sprache, Lizenz …)
// und optionaler Zuordnung zu einem Master-Repository (Hierarchie).
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Collapse,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import BugReportIcon from '@mui/icons-material/BugReport';
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

  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          {tNav('myRepos')}
        </Typography>
        <Button onClick={() => setShowForm(!showForm)} variant="contained" startIcon={<AddIcon />}>
          {t('create')}
        </Button>
      </Box>

      <Collapse in={showForm}>
        <Card variant="outlined">
          <CardContent>
            <form onSubmit={createRepo}>
              <Stack spacing={2.5}>
                {/* Pflichtfelder */}
                <Grid container spacing={2.5}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label={`${t('title')} *`}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      slotProps={{ htmlInput: { minLength: 2 } }}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>{t('access')}</InputLabel>
                      <Select
                        label={t('access')}
                        value={access}
                        onChange={(e) => setAccess(e.target.value as any)}
                      >
                        <MenuItem value="PUBLIC_DOWNLOAD">{t('publicDownload')}</MenuItem>
                        <MenuItem value="APPROVAL_REQUIRED">{t('approvalRequired')}</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                <TextField
                  label={t('description')}
                  multiline
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  fullWidth
                />

                <Typography variant="h6" component="h3" sx={{ pt: 1 }}>
                  {tMeta('metadataTitle')}
                </Typography>
                <Grid container spacing={2.5}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>{t('subject')}</InputLabel>
                      <Select label={t('subject')} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                        <MenuItem value="">{tMeta('noSelection')}</MenuItem>
                        {subjects.map((s) => (
                          <MenuItem key={s.id} value={s.id}>{s.labels?.de || s.key}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>{t('schoolLevel')}</InputLabel>
                      <Select label={t('schoolLevel')} value={schoolLevel} onChange={(e) => setSchoolLevel(e.target.value)}>
                        <MenuItem value="">{tMeta('noSelection')}</MenuItem>
                        {SCHOOL_LEVELS.map((l) => (
                          <MenuItem key={l} value={l}>{tMeta(`levels.${l}`)}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>{t('language')}</InputLabel>
                      <Select
                        label={t('language')}
                        value={contentLanguage}
                        onChange={(e) => setContentLanguage(e.target.value)}
                      >
                        {CONTENT_LANGUAGES.map((l) => (
                          <MenuItem key={l} value={l}>{tMeta(`langs.${l}`)}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>{tMeta('materialType')}</InputLabel>
                      <Select label={tMeta('materialType')} value={materialType} onChange={(e) => setMaterialType(e.target.value)}>
                        <MenuItem value="">{tMeta('noSelection')}</MenuItem>
                        {MATERIAL_TYPES.map((mt) => (
                          <MenuItem key={mt} value={mt}>{tMeta(`types.${mt}`)}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>{tMeta('educationSector')}</InputLabel>
                      <Select
                        label={tMeta('educationSector')}
                        value={educationSector}
                        onChange={(e) => setEducationSector(e.target.value)}
                      >
                        <MenuItem value="">{tMeta('noSelection')}</MenuItem>
                        <MenuItem value="GENERAL">{tMeta('sectors.GENERAL')}</MenuItem>
                        <MenuItem value="VOCATIONAL">{tMeta('sectors.VOCATIONAL')}</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>{t('license')}</InputLabel>
                      <Select label={t('license')} value={license} onChange={(e) => setLicense(e.target.value)}>
                        <MenuItem value="">{tMeta('noSelection')}</MenuItem>
                        {LICENSES.map((l) => (
                          <MenuItem key={l} value={l}>{l}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                {/* Pädagogische Metadaten */}
                <Grid container spacing={2.5}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label={tMeta('curriculum21')}
                      placeholder={tMeta('curriculum21Placeholder')}
                      value={curriculum21}
                      onChange={(e) => setCurriculum21(e.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label={tMeta('targetGroup')}
                      placeholder={tMeta('targetGroupPlaceholder')}
                      value={targetGroup}
                      onChange={(e) => setTargetGroup(e.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label={tMeta('timeRequired')}
                      placeholder={tMeta('timeRequiredPlaceholder')}
                      value={timeRequired}
                      onChange={(e) => setTimeRequired(e.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>{tMeta('difficulty')}</InputLabel>
                      <Select label={tMeta('difficulty')} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                        <MenuItem value="">{tMeta('noSelection')}</MenuItem>
                        <MenuItem value="beginner">{tMeta('difficultyLevels.beginner')}</MenuItem>
                        <MenuItem value="intermediate">{tMeta('difficultyLevels.intermediate')}</MenuItem>
                        <MenuItem value="advanced">{tMeta('difficultyLevels.advanced')}</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                {/* Tags */}
                {tags.length > 0 && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                      {tMeta('tags')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {tags.map((tag) => {
                        const active = selectedTags.includes(tag.id);
                        return (
                          <Chip
                            key={tag.id}
                            label={tag.name}
                            onClick={() => toggleTag(tag.id)}
                            color={active ? 'primary' : 'default'}
                            variant={active ? 'filled' : 'outlined'}
                            size="small"
                          />
                        );
                      })}
                    </Box>
                  </Box>
                )}

                {/* Hierarchie: Master-Repository wählen */}
                <Box>
                  <FormControl fullWidth>
                    <InputLabel>{tMeta('parentRepo')}</InputLabel>
                    <Select label={tMeta('parentRepo')} value={parentId} onChange={(e) => setParentId(e.target.value)}>
                      <MenuItem value="">{tMeta('noParent')}</MenuItem>
                      {items.filter((r) => !r.parentId).map((r) => (
                        <MenuItem key={r.id} value={r.id}>
                          {repoTitle(r)} {r.isFork ? '(Fork)' : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    {tMeta('parentRepoHint')}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button type="submit" variant="contained" disabled={saving}>
                    {saving ? tCommon('loading') : tCommon('save')}
                  </Button>
                  <Button type="button" onClick={() => setShowForm(false)} variant="outlined">
                    {tCommon('cancel')}
                  </Button>
                </Box>
              </Stack>
            </form>
          </CardContent>
        </Card>
      </Collapse>

      {loading ? (
        <Typography color="text.secondary">{tCommon('loading')}</Typography>
      ) : items.length === 0 ? (
        <Typography color="text.secondary">{t('emptyMine')}</Typography>
      ) : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' } }}>
          {items.map((item) => (
            <Card key={item.id} variant="outlined" sx={{ height: '100%' }}>
              <CardActionArea
                component={Link}
                href={`/repositories/${item.id}`}
                sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
              >
                <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {item.isFork && <CallSplitIcon fontSize="small" />}
                    {item.parentId && <Inventory2Icon fontSize="small" />}
                    {repoTitle(item)}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {item.description?.de || item.description?.en || ''}
                  </Typography>
                  <Box sx={{ mt: 'auto' }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
                      <Chip label={item.contentLanguage} size="small" />
                      <Chip
                        label={item.access === 'PUBLIC_DOWNLOAD' ? t('publicDownload') : t('approvalRequired')}
                        size="small"
                      />
                      {item.parentId && <Chip label={tMeta('subRepoBadge')} size="small" />}
                      {(item._count?.issues ?? 0) > 0 && (
                        <Chip icon={<BugReportIcon style={{ fontSize: 14 }} />} label={item._count?.issues} size="small" variant="outlined" />
                      )}
                      {(item._count?.pullRequestsTo ?? 0) > 0 && (
                        <Chip icon={<CallSplitIcon style={{ fontSize: 14 }} />} label={item._count?.pullRequestsTo} size="small" variant="outlined" />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      von {item.owner.displayName}
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}
    </Stack>
  );
}