'use client';

// Admin-Bereich (MUI): Nutzer direkt anlegen (ohne Registrierungsanfrage),
// Registrierungen freigeben und Nutzer verwalten (aktivieren, sperren,
// deaktivieren, löschen mit Kulanzfrist, Profil einsehen).
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  FormControl,
  InputLabel,
  Link as MuiLink,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
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

/** Chip-Farbe für Status-Badges. */
function statusChipColor(status: string): 'success' | 'info' | 'error' | 'warning' | 'default' {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'PENDING':
      return 'info';
    case 'SOFT_DELETED':
      return 'error';
    case 'LOCKED':
      return 'warning';
    case 'DEACTIVATED':
      return 'default';
    default:
      return 'default';
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
  const [createMsgOk, setCreateMsgOk] = useState(true);

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
      setCreateMsgOk(true);
      setCreateMsg('✓ ' + t('userCreated', { email: newEmail }));
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      setNewRole('USER');
      load();
    } catch (err: any) {
      setCreateMsgOk(false);
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

  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Stack spacing={4}>
      {/* Nutzer direkt anlegen */}
      <Box>
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            {t('createUserTitle')}
          </Typography>
          <Button onClick={() => setShowCreate(!showCreate)} variant="contained" startIcon={<AddIcon />}>
            {t('createUser')}
          </Button>
        </Box>

        <Collapse in={showCreate}>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <form onSubmit={createUser}>
                <Stack spacing={2.5}>
                  <TextField
                    label={tAuth('registerName')}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    slotProps={{ htmlInput: { minLength: 2 } }}
                    fullWidth
                  />
                  <TextField
                    type="email"
                    label={tAuth('registerEmail')}
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    fullWidth
                  />
                  <Box>
                    <TextField
                      type="text"
                      label={tAuth('registerPassword')}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('passwordOptional')}
                      slotProps={{ htmlInput: { minLength: 8 } }}
                      fullWidth
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {t('passwordHint')}
                    </Typography>
                  </Box>
                  <FormControl fullWidth>
                    <InputLabel>{t('setRole')}</InputLabel>
                    <Select label={t('setRole')} value={newRole} onChange={(e) => setNewRole(e.target.value as any)}>
                      <MenuItem value="USER">USER</MenuItem>
                      <MenuItem value="MODERATOR">MODERATOR</MenuItem>
                      <MenuItem value="ADMIN">ADMIN</MenuItem>
                    </Select>
                  </FormControl>
                  {createMsg && <Alert severity={createMsgOk ? 'success' : 'error'}>{createMsg}</Alert>}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button type="submit" variant="contained" disabled={creating} startIcon={<PersonAddIcon />}>
                      {creating ? tCommon('loading') : t('createUser')}
                    </Button>
                    <Button type="button" onClick={() => setShowCreate(false)} variant="outlined">
                      {tCommon('cancel')}
                    </Button>
                  </Box>
                </Stack>
              </form>
            </CardContent>
          </Card>
        </Collapse>
      </Box>

      {/* Ausstehende Registrierungen */}
      <Box>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 2 }}>
          {t('pendingUsers')} ({pending.length})
        </Typography>
        {pending.length === 0 ? (
          <Typography variant="body2" color="text.secondary">{t('noPending')}</Typography>
        ) : (
          <Stack spacing={1.5}>
            {pending.map((u) => (
              <Card key={u.id} variant="outlined">
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, px: 2, py: 1.5 }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{u.displayName}</Typography>
                    <Typography variant="body2" color="text.secondary">{u.email}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button onClick={() => approve(u.id)} variant="contained" size="small">
                      {t('approve')}
                    </Button>
                    <Button onClick={() => reject(u.id)} variant="outlined" size="small" color="error">
                      {t('reject')}
                    </Button>
                  </Box>
                </Box>
              </Card>
            ))}
          </Stack>
        )}
      </Box>

      {/* Alle Nutzer */}
      <Box>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 2 }}>
          {t('users')}
        </Typography>
        <TableContainer component={Card} variant="outlined">
          <Table sx={{ minWidth: 650 }} size="small" aria-label={t('users')}>
            <TableHead>
              <TableRow>
                <TableCell>{tAuth('registerName')}</TableCell>
                <TableCell>{tAuth('registerEmail')}</TableCell>
                <TableCell>{t('setRole')}</TableCell>
                <TableCell>{t('status')}</TableCell>
                <TableCell>{t('actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => {
                const retention = retentionDaysLeft(u.permanentDeleteAt);
                return (
                  <TableRow key={u.id} hover>
                    {/* Klick auf Name => Profil des Nutzers */}
                    <TableCell>
                      <MuiLink component={Link} href={`/admin/users/${u.id}`} fontWeight={600} underline="hover">
                        {u.displayName}
                      </MuiLink>
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      {u.role === 'ADMIN' ? (
                        u.role
                      ) : (
                        <Select
                          size="small"
                          value={u.role}
                          onChange={(e) => changeRole(u.id, e.target.value)}
                          sx={{ minWidth: 130, fontSize: '0.8rem' }}
                        >
                          <MenuItem value="USER">USER</MenuItem>
                          <MenuItem value="MODERATOR">MODERATOR</MenuItem>
                          <MenuItem value="ADMIN">ADMIN</MenuItem>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5} alignItems="flex-start">
                        <Chip label={u.status} size="small" color={statusChipColor(u.status)} />
                        {/* Laufende Kulanzfrist anzeigen */}
                        {retention !== null && (
                          <Chip label={`⏳ ${t('retentionRunning', { days: retention })}`} size="small" color="error" variant="outlined" />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {u.role !== 'ADMIN' && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(u.status === 'DEACTIVATED' || u.status === 'LOCKED') && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              onClick={() => setStatus(u.id, 'ACTIVE')}
                              disabled={busyId === u.id}
                            >
                              ✓ {t('activate')}
                            </Button>
                          )}
                          {u.status === 'ACTIVE' && (
                            <>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => setStatus(u.id, 'LOCKED')}
                                disabled={busyId === u.id}
                              >
                                🔒 {t('lock')}
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => setStatus(u.id, 'DEACTIVATED')}
                                disabled={busyId === u.id}
                              >
                                ⏸ {t('deactivate')}
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => deleteUserWithRetention(u)}
                                disabled={busyId === u.id}
                              >
                                🗑 {t('deleteUser')}
                              </Button>
                            </>
                          )}
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Stack>
  );
}