'use client';

// Admin/Moderator (MUI): Nutzerprofil einsehen (Klick auf den Nutzernamen
// in der Nutzerverwaltung). Zeigt Stamm- und Lehrberufsdaten im Nur-Lese-Modus
// und bietet Schnellaktionen (Status ändern, löschen mit Kulanzfrist).
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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
  const [msgOk, setMsgOk] = useState(true);
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

  const flash = (text: string, ok: boolean) => {
    setMsgOk(ok);
    setMsg(text);
  };

  const setStatus = async (status: 'ACTIVE' | 'LOCKED' | 'DEACTIVATED') => {
    setBusy(true);
    setMsg(null);
    try {
      await api.patch(`/users/${params.id}/status`, { status });
      flash('✓ ' + tAdmin('statusUpdated'), true);
      load();
    } catch (err: any) {
      flash('✗ ' + err.message, false);
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
      flash('✓ ' + tAdmin('deleteScheduled', { date: new Date(res.permanentDeleteAt).toLocaleDateString() }), true);
      load();
    } catch (err: any) {
      flash('✗ ' + err.message, false);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

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
    <Stack spacing={4}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          {tAdmin('userProfile')}
        </Typography>
        <Button component={Link} href="/admin" variant="outlined" startIcon={<ArrowBackIcon />}>
          {tAdmin('backToUsers')}
        </Button>
      </Box>

      {/* Kopf mit Avatar (Standard-Profilbild, falls keines vorhanden) */}
      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2.5 }}>
            <Avatar
              avatarUrl={user.avatarUrl}
              name={user.displayName || user.email}
              size={72}
              endpoint={`/users/${user.id}/avatar`}
            />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
                  {user.displayName}
                </Typography>
                <Chip
                  size="small"
                  color={user.status === 'ACTIVE' ? 'success' : 'warning'}
                  label={user.status}
                />
                {retentionLeft !== null && (
                  <Chip size="small" color="error" variant="outlined" label={tAdmin('retentionRunning', { days: retentionLeft })} />
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {user.email}
              </Typography>
            </Box>
            {/* Schnellaktionen */}
            {user.role !== 'ADMIN' && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {user.status !== 'ACTIVE' && user.status !== 'SOFT_DELETED' && (
                  <Button onClick={() => setStatus('ACTIVE')} variant="contained" size="small" disabled={busy}>
                    ✓ {tAdmin('activate')}
                  </Button>
                )}
                {user.status === 'ACTIVE' && (
                  <>
                    <Button onClick={() => setStatus('LOCKED')} variant="outlined" size="small" disabled={busy}>
                      🔒 {tAdmin('lock')}
                    </Button>
                    <Button onClick={() => setStatus('DEACTIVATED')} variant="outlined" size="small" disabled={busy}>
                      ⏸ {tAdmin('deactivate')}
                    </Button>
                    <Button onClick={deleteUser} variant="outlined" size="small" color="error" disabled={busy}>
                      🗑 {tAdmin('deleteUser')}
                    </Button>
                  </>
                )}
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {msg && <Alert severity={msgOk ? 'success' : 'error'}>{msg}</Alert>}

      {/* Stammdaten */}
      <Box>
        <Typography variant="h6" component="h3" sx={{ mb: 1.5 }}>
          {tAdmin('accountData')}
        </Typography>
        <Card variant="outlined">
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            {rows.map(([label, value], idx) => (
              <Box key={label}>
                {idx > 0 && <Divider />}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, px: 2, py: 1.25 }}>
                  <Typography variant="body2" color="text.secondary">{label}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'right' }}>{value || '—'}</Typography>
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Box>

      {/* Lehrberuf */}
      <Box>
        <Typography variant="h6" component="h3" sx={{ mb: 1.5 }}>
          {tProfile('sectionTitle')}
        </Typography>
        <Card variant="outlined">
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            {teacherRows.map(([label, value], idx) => (
              <Box key={label}>
                {idx > 0 && <Divider />}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, px: 2, py: 1.25 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>{label}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value || '—'}</Typography>
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Box>

      {/* Bio & Kurz-CV */}
      {(user.bio || user.curriculumVitae) && (
        <Stack spacing={2}>
          {user.bio && (
            <Box>
              <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
                {tProfile('bio')}
              </Typography>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{user.bio}</Typography>
                </CardContent>
              </Card>
            </Box>
          )}
          {user.curriculumVitae && (
            <Box>
              <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
                {tProfile('curriculumVitae')}
              </Typography>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{user.curriculumVitae}</Typography>
                </CardContent>
              </Card>
            </Box>
          )}
        </Stack>
      )}

      <Typography variant="caption" color="text.secondary">{tAdmin('readOnlyNotice')}</Typography>
    </Stack>
  );
}