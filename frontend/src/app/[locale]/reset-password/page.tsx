'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { api } from '../../../lib/api';
import { Link } from '../../../i18n/navigation';

function ResetForm() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/auth/password-reset/confirm', { token, newPassword: password });
      setDone(true);
    } catch (err: any) {
      setError(err?.message || 'Zurücksetzen fehlgeschlagen.');
    }
  };

  if (done) {
    return (
      <Box sx={{ maxWidth: 420, mx: 'auto', textAlign: 'center' }}>
        <Box sx={{ mb: 2, color: 'success.main', display: 'flex', justifyContent: 'center' }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 56 }} />
        </Box>
        <Typography sx={{ mb: 3 }}>Passwort erfolgreich geändert. Du kannst dich jetzt anmelden.</Typography>
        <Button component={Link} href="/login" variant="contained">
          {t('loginTitle')}
        </Button>
      </Box>
    );
  }

  if (!token) {
    return (
      <Box sx={{ maxWidth: 420, mx: 'auto' }}>
        <Alert severity="error">Ungültiger oder fehlender Reset-Link.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 420, mx: 'auto' }}>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
        {t('resetTitle')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('resetConfirmDesc')}
      </Typography>
      <Card variant="outlined">
        <CardContent sx={{ p: 3 }}>
          <form onSubmit={submit}>
            <Stack spacing={2.5}>
              <TextField
                type="password"
                required
                slotProps={{ htmlInput: { minLength: 8 } }}
                label={t('resetNewPassword')}
                placeholder={t('resetNewPassword')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                fullWidth
              />
              {error && <Alert severity="error">{error}</Alert>}
              <Button type="submit" variant="contained" fullWidth size="large">
                {t('resetSubmit')}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Lädt…</div>}>
      <ResetForm />
    </Suspense>
  );
}