'use client';

// Kopfzeile als MUI AppBar: Titel links (gross/fett), Sprachumschalter,
// Theme-Umschalter und Nutzerbereich rechtsbuendig. Fuer angemeldete
// Nutzer zusaetzlich ein Button zum Ein-/Ausklappen der Sidebar.
import { AppBar, Box, IconButton, Toolbar, Tooltip, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import { useTranslations } from 'next-intl';
import { Link } from '../i18n/navigation';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { HeaderUserArea } from './HeaderUserArea';
import { useSession } from './SessionProvider';
import { useSidebarState } from './SidebarContext';

export function Header() {
  const t = useTranslations('common');
  const tNav = useTranslations('nav');
  const { user, loading } = useSession();
  const { collapsed, toggle } = useSidebarState();

  // Der Einklapp-Button ist nur sinnvoll, wenn die Sidebar existiert
  const showToggle = !loading && !!user;

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
      <Toolbar
        disableGutters
        sx={{ minHeight: 64, px: { xs: 1.5, sm: 2.5 }, gap: 0.5, width: '100%' }}
      >
        {/* Sidebar ein-/ausklappen (nur angemeldete Nutzer) */}
        {showToggle && (
          <Tooltip title={collapsed ? tNav('expandSidebar') : tNav('collapseSidebar')}>
            <IconButton
              onClick={toggle}
              edge="start"
              aria-label={collapsed ? tNav('expandSidebar') : tNav('collapseSidebar')}
              sx={{ mr: 0.5 }}
            >
              {collapsed ? <MenuIcon /> : <MenuOpenIcon />}
            </IconButton>
          </Tooltip>
        )}

        {/* Titel: links, gross und fett */}
        <Box
          component={Link}
          href="/"
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 1.5,
            textDecoration: 'none',
            color: 'inherit',
            minWidth: 0,
            mr: 'auto', // schiebt die Steuerungen nach rechts
          }}
        >
          <Typography
            component="span"
            noWrap
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.2rem', sm: '1.4rem' },
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
            }}
          >
            Edu
            <Typography component="span" sx={{ fontWeight: 800, fontSize: 'inherit', color: 'primary.main' }}>
              Repo
            </Typography>
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            noWrap
            sx={{ display: { xs: 'none', md: 'inline' } }}
          >
            {t('tagline')}
          </Typography>
        </Box>

        {/* Steuerungen: rechtsbuendig */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
          <LanguageSwitcher />
          <ThemeToggle />
          <HeaderUserArea />
        </Box>
      </Toolbar>
    </AppBar>
  );
}