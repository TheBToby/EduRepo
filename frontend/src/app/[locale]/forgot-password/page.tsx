'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import { api } from '../../../lib/api';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/auth/password-reset/request', { email });
    setSent(true);
  };

  if (sent) {
    return (
      <Box sx={{ maxWidth: 420, mx: 'auto', textAlign: 'center' }}>
        <Box sx={{ mb: 2, color: 'primary.main', display: 'flex', justifyContent: 'center' }}>
          <EmailIcon sx={{ fontSize: 56 }} />
        </Box>
        <Typography color="text.secondary">{t('resetRequestDesc')}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 420, mx: 'auto' }}>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
        {t('resetTitle')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('resetRequestDesc')}
      </Typography>
      <Card variant="outlined">
        <CardContent sx={{ p: 3 }}>
          <form onSubmit={submit}>
            <Stack spacing={2.5}>
              <TextField
                type="email"
                required
                placeholder={t('loginEmail')}
                label={t('loginEmail')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
              />
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