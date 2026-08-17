'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Card, CardContent, Divider, Link as MuiLink, Stack, TextField, Typography } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import MicrosoftIcon from '@mui/icons-material/Window';
import { api, ApiError } from '../../../lib/api';
import { Link } from '../../../i18n/navigation';
import { useSession } from '../../../components/SessionProvider';

export default function LoginPage() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { refresh } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/login', { email, password });
      await refresh(); // Session aktualisieren (Sidebar/Header erscheinen sofort)
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Login fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  const oauth = (provider: 'google' | 'microsoft') => {
    // Same-origin ueber den Next.js-Proxy (/api/* → Backend); funktioniert so
    // auch hinter Reverse-Proxys (Coder-URL). NEXT_PUBLIC_API_URL nur setzen,
    // wenn der Browser das Backend direkt erreichen soll.
    const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
    window.location.href = `${apiBase}/auth/${provider}`;
  };

  return (
    <Box sx={{ maxWidth: 420, mx: 'auto' }}>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 3 }}>
        {t('loginTitle')}
      </Typography>
      <Card variant="outlined">
        <CardContent sx={{ p: 3 }}>
          <form onSubmit={submit}>
            <Stack spacing={2.5}>
              <TextField
                type="email"
                required
                label={t('loginEmail')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                fullWidth
              />
              <TextField
                type="password"
                required
                label={t('loginPassword')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                fullWidth
              />
              {error && <Alert severity="error">{error}</Alert>}
              <Button type="submit" variant="contained" fullWidth disabled={loading} size="large">
                {loading ? tCommon('loading') : t('loginSubmit')}
              </Button>
            </Stack>
          </form>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <MuiLink component={Link} href="/forgot-password" variant="body2" underline="hover">
              {t('forgotPassword')}
            </MuiLink>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Stack spacing={1.5}>
            <Button onClick={() => oauth('google')} variant="outlined" fullWidth startIcon={<GoogleIcon />}>
              {t('loginGoogle')}
            </Button>
            <Button onClick={() => oauth('microsoft')} variant="outlined" fullWidth startIcon={<MicrosoftIcon />}>
              {t('loginMicrosoft')}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
        <MuiLink component={Link} href="/register" underline="hover">
          {tCommon('register')}
        </MuiLink>
      </Typography>
    </Box>
  );
}