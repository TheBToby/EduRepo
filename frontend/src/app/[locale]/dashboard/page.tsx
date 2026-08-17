'use client';

import { useTranslations } from 'next-intl';
import { Box, Button, Card, CardActionArea, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import ShieldIcon from '@mui/icons-material/Shield';
import { Link } from '../../../i18n/navigation';
import { useSession } from '../../../components/SessionProvider';

export default function DashboardPage() {
  const t = useTranslations('nav');
  const tAuth = useTranslations('auth');
  const tCommon = useTranslations('common');
  const { user, loading } = useSession();

  const tiles = [
    { href: '/repositories', label: t('myRepos'), icon: <MenuBookIcon color="primary" /> },
    { href: '/browse', label: t('browse'), icon: <SearchIcon color="primary" /> },
    { href: '/profile', label: t('profile'), icon: <PersonIcon color="primary" /> },
    ...(user && (user.role === 'MODERATOR' || user.role === 'ADMIN')
      ? [{ href: '/admin', label: t('admin'), icon: <ShieldIcon color="primary" /> }]
      : []),
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography sx={{ mb: 2 }}>Bitte melde dich an, um dein Dashboard zu sehen.</Typography>
        <Button component={Link} href="/login" variant="contained">
          {tCommon('login')}
        </Button>
      </Box>
    );
  }

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          {t('dashboard')}: {user.displayName}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {user.email} · {user.role}
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' } }}>
        {tiles.map((tile) => (
          <Card key={tile.href} variant="outlined" sx={{ height: '100%' }}>
            <CardActionArea component={Link} href={tile.href} sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ mb: 1.5 }}>{tile.icon}</Box>
                <Typography variant="h6" component="h2">
                  {tile.label}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Box>
    </Stack>
  );
}