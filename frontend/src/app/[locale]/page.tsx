'use client';

import { useTranslations } from 'next-intl';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import LockIcon from '@mui/icons-material/Lock';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import StarIcon from '@mui/icons-material/StarRate';
import InfoIcon from '@mui/icons-material/Info';
import { Link } from '../../i18n/navigation';
import { useSession } from '../../components/SessionProvider';

// Landing Page: kompakt geschnitten, damit sie ohne vertikales Scrollen
// in eine Bildschirmseite passt (Hero -> Features -> Hinweis).
export default function LandingPage() {
  const t = useTranslations('landing');
  const tNav = useTranslations('nav');
  const { user } = useSession();

  const features = [
    { icon: <MenuBookIcon color="primary" />, title: t('featureReposTitle'), desc: t('featureReposDesc') },
    { icon: <LockIcon color="primary" />, title: t('featureSecureTitle'), desc: t('featureSecureDesc') },
    { icon: <TrackChangesIcon color="primary" />, title: t('featureCurriculumTitle'), desc: t('featureCurriculumDesc') },
    { icon: <StarIcon color="primary" />, title: t('featureRatingTitle'), desc: t('featureRatingDesc') },
  ];

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 2, md: 3 },
        minHeight: 0,
        py: { xs: 0.5, md: 1 },
        maxWidth: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Hero – zentriert, nimmt den verfuegbaren Platz ein */}
      <Box
        sx={{
          flex: { md: '1 1 auto' },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          minHeight: 0,
        }}
      >
        {user ? (
          // Angemeldet: persoenliche Begruessung + direkter Zugriff auf Features
          <>
            <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 600, mb: 0.75 }}>
              {t('welcomeBack')}
            </Typography>
            <Typography
              component="h1"
              noWrap
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.02em',
                fontSize: { xs: '1.6rem', sm: '2.1rem', md: '2.6rem' },
                lineHeight: 1.15,
                maxWidth: '100%',
              }}
            >
              {user.displayName}
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mt: 1, mx: 'auto', maxWidth: 560 }}
            >
              {t('heroSubtitleLoggedIn')}
            </Typography>
            <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap" sx={{ mt: 2 }}>
              <Button component={Link} href="/dashboard" variant="contained">
                {tNav('dashboard')}
              </Button>
              <Button component={Link} href="/repositories" variant="outlined">
                {tNav('myRepos')}
              </Button>
              <Button component={Link} href="/browse" variant="outlined">
                {tNav('browse')}
              </Button>
            </Stack>
          </>
        ) : (
          // Gast: Registrierung/Login
          <>
            <Typography
              component="h1"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.02em',
                mx: 'auto',
                maxWidth: 760,
                fontSize: { xs: '1.6rem', sm: '2.1rem', md: '2.6rem' },
                lineHeight: 1.2,
              }}
            >
              {t('heroTitle')}
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mt: 1.25, mx: 'auto', maxWidth: 600 }}
            >
              {t('heroSubtitle')}
            </Typography>
            <Typography variant="subtitle2" color="primary" sx={{ mt: 1, fontWeight: 600 }}>
              {t('forTeachers')}
            </Typography>
            <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap" sx={{ mt: 2 }}>
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

      {/* Features – kompakte Karten */}
      <Box
        sx={{
          display: 'grid',
          gap: { xs: 1.5, md: 2 },
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          flexShrink: 0,
        }}
      >
        {features.map((f) => (
          <Card key={f.title} variant="outlined" sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
              <Box sx={{ mb: 1, '& .MuiSvgIcon-root': { fontSize: 28 } }}>{f.icon}</Box>
              <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5, fontSize: { xs: '0.9rem', md: '1rem' } }}>
                {f.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', md: '0.825rem' } }}>
                {f.desc}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Hinweis nur Lehrpersonen */}
      <Card
        variant="outlined"
        sx={{ flexShrink: 0, borderColor: 'primary.main', bgcolor: 'primary.main', color: 'primary.contrastText' }}
      >
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
          <InfoIcon />
          <Typography variant="body2">{t('infoOnlyTeachers')}</Typography>
        </CardContent>
      </Card>
    </Box>
  );
}