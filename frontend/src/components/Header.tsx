'use client';

// Kopfzeile als MUI AppBar: Logo/Claim, Sprachumschalter, Theme-Umschalter,
// Nutzerbereich. Sticky mit sanftem Hintergrund-Blur.
import { AppBar, Box, Container, Divider, Toolbar, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { Link } from '../i18n/navigation';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { HeaderUserArea } from './HeaderUserArea';

export function Header() {
  const t = useTranslations('common');
  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="inherit"
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        backdropFilter: 'blur(8px)',
        bgcolor: (theme) =>
          theme.palette.mode === 'dark'
            ? 'rgba(30, 41, 59, 0.85)'
            : 'rgba(255, 255, 255, 0.85)',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ minHeight: 64, gap: 2 }}>
          <Box
            component={Link}
            href="/"
            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, textDecoration: 'none', color: 'inherit' }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                px: 1.25,
                py: 0.5,
                borderRadius: 1.5,
              }}
            >
              EduRepo
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: { xs: 'none', sm: 'block' } }}
            >
              {t('tagline')}
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <LanguageSwitcher />
          <ThemeToggle />
          <HeaderUserArea />
        </Toolbar>
      </Container>
    </AppBar>
  );
}