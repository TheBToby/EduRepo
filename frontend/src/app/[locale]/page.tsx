'use client';

import { useTranslations } from 'next-intl';
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import LockIcon from '@mui/icons-material/Lock';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import StarIcon from '@mui/icons-material/StarRate';
import InfoIcon from '@mui/icons-material/Info';
import { Link } from '../../i18n/navigation';
import { useSession } from '../../components/SessionProvider';

export default function LandingPage() {
  const t = useTranslations('landing');
  const tNav = useTranslations('nav');
  const { user, loading } = useSession();

  const features = [
    { icon: <MenuBookIcon color="primary" />, title: t('featureReposTitle'), desc: t('featureReposDesc') },
    { icon: <LockIcon color="primary" />, title: t('featureSecureTitle'), desc: t('featureSecureDesc') },
    { icon: <TrackChangesIcon color="primary" />, title: t('featureCurriculumTitle'), desc: t('featureCurriculumDesc') },
    { icon: <StarIcon color="primary" />, title: t('featureRatingTitle'), desc: t('featureRatingDesc') },
  ];

  return (
    <Stack spacing={{ xs: 6, md: 10 }}>
      {/* Hero */}
      <Box sx={{ textAlign: 'center', pt: { xs: 2, md: 4 } }}>
        {user ? (
          // Angemeldet: persoenliche Begruessung + direkter Zugriff auf Features
          <>
            <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600, mb: 1.5 }}>
              {t('welcomeBack')}
            </Typography>
            <Typography
              variant="h3"
              component="h1"
              sx={{ fontWeight: 800, letterSpacing: '-0.02em', mx: 'auto', maxWidth: 720 }}
            >
              {user.displayName}
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mt: 2.5, mx: 'auto', maxWidth: 600, fontWeight: 400 }}>
              {t('heroSubtitleLoggedIn')}
            </Typography>
            <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap" sx={{ mt: 4 }}>
              <Button component={Link} href="/dashboard" variant="contained" size="large">
                {tNav('dashboard')}
              </Button>
              <Button component={Link} href="/repositories" variant="outlined" size="large">
                {tNav('myRepos')}
              </Button>
              <Button component={Link} href="/browse" variant="outlined" size="large">
                {tNav('browse')}
              </Button>
            </Stack>
          </>
        ) : (
          // Gast: Registrierung/Login
          <>
            <Typography
              variant="h3"
              component="h1"
              sx={{ fontWeight: 800, letterSpacing: '-0.02em', mx: 'auto', maxWidth: 720 }}
            >
              {t('heroTitle')}
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mt: 2.5, mx: 'auto', maxWidth: 600, fontWeight: 400 }}>
              {t('heroSubtitle')}
            </Typography>
            <Typography variant="subtitle2" color="primary" sx={{ mt: 1.5, fontWeight: 600 }}>
              {t('forTeachers')}
            </Typography>
            <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap" sx={{ mt: 4 }}>
              <Button component={Link} href="/register" variant="contained" size="large">
                {t('ctaRegister')}
              </Button>
              <Button component={Link} href="/login" variant="outlined" size="large">
                {t('ctaLogin')}
              </Button>
            </Stack>
          </>
        )}
      </Box>

      {/* Features */}
      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
        {features.map((f) => (
          <Card key={f.title} variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ mb: 1.5 }}>{f.icon}</Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                {f.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {f.desc}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Hinweis nur Lehrpersonen */}
      <Card
        variant="outlined"
        sx={{ borderColor: 'primary.light', bgcolor: 'primary.main', color: 'primary.contrastText' }}
      >
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, '&:last-child': { pb: 2 } }}>
          <InfoIcon />
          <Typography variant="body2">{t('infoOnlyTeachers')}</Typography>
        </CardContent>
      </Card>
    </Stack>
  );
}