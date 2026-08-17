'use client';

// Profilseite: Profildaten, Profilbild-Upload, Angaben zum Lehrberuf
// (Ausbildung, Schulen, Kurz-CV, Fächer …) und Passwortwechsel.
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
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

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!profile) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

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
    <Box sx={{ maxWidth: 672, mx: 'auto' }}>
      <Stack spacing={5}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          {tNav('profile')}
        </Typography>

        {/* --- Profilbild (mit Standardbild, falls keines hochgeladen) --- */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Avatar avatarUrl={profile.avatarUrl} name={profile.displayName || profile.email} size={80} />
          <Box>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              hidden
              onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
            />
            <Button
              variant="outlined"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
            >
              {avatarUploading ? tCommon('loading') : t('changeAvatar')}
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {t('avatarHint')}
            </Typography>
            {avatarMsg && <Typography variant="body2" sx={{ mt: 0.5 }}>{avatarMsg}</Typography>}
          </Box>
        </Box>

        {/* --- Profildaten --- */}
        <Card variant="outlined">
          <CardContent>
            <form onSubmit={save}>
              <Stack spacing={2.5}>
                <TextField
                  label={t('registerName')}
                  value={profile.displayName}
                  onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                  fullWidth
                />
                <TextField label={tCommon('email')} value={profile.email} disabled fullWidth />
                <TextField
                  label={tProfile('bio')}
                  multiline
                  rows={3}
                  value={profile.bio || ''}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>{tCommon('language')}</InputLabel>
                  <Select
                    label={tCommon('language')}
                    value={profile.uiLanguage}
                    onChange={(e) => setProfile({ ...profile, uiLanguage: e.target.value as any })}
                  >
                    <MenuItem value="DE">Deutsch</MenuItem>
                    <MenuItem value="FR">Français</MenuItem>
                    <MenuItem value="IT">Italiano</MenuItem>
                    <MenuItem value="EN">English</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>{tCommon('theme')}</InputLabel>
                  <Select
                    label={tCommon('theme')}
                    value={profile.themePreference}
                    onChange={(e) => setProfile({ ...profile, themePreference: e.target.value as any })}
                  >
                    <MenuItem value="LIGHT">{tCommon('light')}</MenuItem>
                    <MenuItem value="DARK">{tCommon('dark')}</MenuItem>
                    <MenuItem value="SYSTEM">{tCommon('system')}</MenuItem>
                  </Select>
                </FormControl>
                {saved && <Alert severity="success">{tProfile('saved')}</Alert>}
                <Button type="submit" variant="contained" fullWidth>{tCommon('save')}</Button>
              </Stack>
            </form>
          </CardContent>
        </Card>

        {/* --- Angaben zum Lehrberuf --- */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" component="h2" sx={{ mb: 0.5 }}>
              {tProfile('sectionTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              {tProfile('sectionHint')}
            </Typography>
            <form onSubmit={save}>
              <Stack spacing={2.5}>
                <TextField
                  label={tProfile('jobTitle')}
                  placeholder={tProfile('jobTitlePlaceholder')}
                  value={profile.jobTitle || ''}
                  onChange={(e) => setProfile({ ...profile, jobTitle: e.target.value })}
                  fullWidth
                />
                <TextField
                  label={tProfile('education')}
                  multiline
                  rows={2}
                  placeholder={tProfile('educationPlaceholder')}
                  value={profile.education || ''}
                  onChange={(e) => setProfile({ ...profile, education: e.target.value })}
                  fullWidth
                />
                <TextField
                  label={tProfile('furtherEducation')}
                  multiline
                  rows={2}
                  placeholder={tProfile('furtherEducationPlaceholder')}
                  value={profile.furtherEducation || ''}
                  onChange={(e) => setProfile({ ...profile, furtherEducation: e.target.value })}
                  fullWidth
                />
                <Box>
                  <TextField
                    label={tProfile('schools')}
                    multiline
                    rows={2}
                    placeholder={tProfile('schoolsPlaceholder')}
                    value={(profile.schools || []).join(', ')}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        schools: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    fullWidth
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    {tProfile('listHint')}
                  </Typography>
                </Box>
                <Box>
                  <TextField
                    label={tProfile('subjects')}
                    multiline
                    rows={2}
                    placeholder={tProfile('subjectsPlaceholder')}
                    value={(profile.subjects || []).join(', ')}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        subjects: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    fullWidth
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    {tProfile('listHint')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                    {tProfile('schoolLevels')}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {SCHOOL_LEVELS.map((level) => {
                      const active = (profile.schoolLevels || []).includes(level);
                      return (
                        <Chip
                          key={level}
                          label={tProfile(`levels.${level}`)}
                          onClick={() => toggleSchoolLevel(level)}
                          color={active ? 'primary' : 'default'}
                          variant={active ? 'filled' : 'outlined'}
                          size="small"
                        />
                      );
                    })}
                  </Box>
                </Box>
                <FormControl fullWidth>
                  <InputLabel>{tProfile('educationSector')}</InputLabel>
                  <Select
                    label={tProfile('educationSector')}
                    value={profile.educationSector || ''}
                    onChange={(e) =>
                      setProfile({ ...profile, educationSector: (e.target.value || undefined) as any })
                    }
                  >
                    <MenuItem value="">{tProfile('noSelection')}</MenuItem>
                    <MenuItem value="GENERAL">{tProfile('sectors.GENERAL')}</MenuItem>
                    <MenuItem value="VOCATIONAL">{tProfile('sectors.VOCATIONAL')}</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  type="number"
                  label={tProfile('yearsOfExperience')}
                  placeholder="10"
                  slotProps={{ htmlInput: { min: 0, max: 80 } }}
                  value={profile.yearsOfExperience ?? ''}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      yearsOfExperience: e.target.value === '' ? null : parseInt(e.target.value, 10),
                    })
                  }
                  fullWidth
                />
                <TextField
                  label={tProfile('curriculumVitae')}
                  multiline
                  rows={5}
                  placeholder={tProfile('curriculumVitaePlaceholder')}
                  value={profile.curriculumVitae || ''}
                  onChange={(e) => setProfile({ ...profile, curriculumVitae: e.target.value })}
                  fullWidth
                />
                <TextField
                  type="url"
                  label={tProfile('websiteUrl')}
                  placeholder="https://…"
                  value={profile.websiteUrl || ''}
                  onChange={(e) => setProfile({ ...profile, websiteUrl: e.target.value })}
                  fullWidth
                />
                {saved && <Alert severity="success">{tProfile('saved')}</Alert>}
                <Button type="submit" variant="contained" fullWidth>{tCommon('save')}</Button>
              </Stack>
            </form>
          </CardContent>
        </Card>

        {/* --- Passwort wechseln --- */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
              {t('changePasswordTitle')}
            </Typography>
            <form onSubmit={changePassword}>
              <Stack spacing={2.5}>
                <TextField
                  type="password"
                  label={t('currentPassword')}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  fullWidth
                />
                <TextField
                  type="password"
                  label={t('resetNewPassword')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  slotProps={{ htmlInput: { minLength: 8 } }}
                  autoComplete="new-password"
                  fullWidth
                />
                <TextField
                  type="password"
                  label={t('confirmPassword')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  slotProps={{ htmlInput: { minLength: 8 } }}
                  autoComplete="new-password"
                  fullWidth
                />
                {pwError && <Alert severity="error">{pwError}</Alert>}
                {pwMsg && <Alert severity="success">{pwMsg}</Alert>}
                <Button type="submit" variant="contained" fullWidth disabled={pwSaving}>
                  {pwSaving ? tCommon('loading') : t('changePasswordTitle')}
                </Button>
              </Stack>
            </form>
          </CardContent>
        </Card>

        {/* --- Konto löschen --- */}
        <Card variant="outlined" sx={{ borderColor: 'error.main' }}>
          <CardContent>
            <Typography variant="h6" component="h2" sx={{ mb: 1, color: 'error.main' }}>
              {t('deleteAccountTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('deleteAccountDesc')}
            </Typography>
            <Button onClick={deleteAccount} variant="outlined" color="error">
              {t('deleteAccountTitle')}
            </Button>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}