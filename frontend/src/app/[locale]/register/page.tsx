'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Card, CardContent, Link as MuiLink, Stack, TextField, Typography } from '@mui/material';
import { api } from '../../../lib/api';
import { Link } from '../../../i18n/navigation';

export default function RegisterPage() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [form, setForm] = useState({ displayName: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      router.push('/pending');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Registrierung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 420, mx: 'auto' }}>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
        {t('registerTitle')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('registerNotice')}
      </Typography>
      <Card variant="outlined">
        <CardContent sx={{ p: 3 }}>
          <form onSubmit={submit}>
            <Stack spacing={2.5}>
              <TextField
                required
                label={t('registerName')}
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                fullWidth
              />
              <TextField
                type="email"
                required
                label={t('registerEmail')}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
                fullWidth
              />
              <TextField
                type="password"
                required
                slotProps={{ htmlInput: { minLength: 8 } }}
                label={t('registerPassword')}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="new-password"
                fullWidth
              />
              {error && <Alert severity="error">{error}</Alert>}
              <Button type="submit" variant="contained" fullWidth disabled={loading} size="large">
                {loading ? tCommon('loading') : t('registerSubmit')}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
      <Typography variant="body2" sx={{ mt: 3, textAlign: 'center' }}>
        <MuiLink component={Link} href="/login" underline="hover">
          {t('loginTitle')}
        </MuiLink>
      </Typography>
    </Box>
  );
}