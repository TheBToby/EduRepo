'use client';

// Moderne Sidebar-Navigation (MUI Drawer): nur fuer angemeldete Nutzer
// sichtbar. Zeigt ausschliesslich die Features, die fuer Rolle/Profil
// verfuegbar sind. Auf dem Desktop ueber den Titelbar-Button zwischen
// voller Breite und Mini-Variante (nur Icons) umschaltbar; auf Mobile
// temporaer als Overlay-Drawer.
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '../i18n/navigation';
import { useSession } from './SessionProvider';
import { useSidebarState, EXPANDED_WIDTH, COLLAPSED_WIDTH } from './SidebarContext';
import { Avatar } from './Avatar';
import { Box, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Tooltip, Typography } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import ShieldIcon from '@mui/icons-material/Shield';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';

type NavItem = {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
  roles?: Array<'USER' | 'MODERATOR' | 'ADMIN'>; // undefined = alle angemeldeten Nutzer
};

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', labelKey: 'dashboard', icon: <DashboardIcon /> },
  { href: '/repositories', labelKey: 'myRepos', icon: <MenuBookIcon /> },
  { href: '/browse', labelKey: 'browse', icon: <SearchIcon /> },
  { href: '/profile', labelKey: 'profile', icon: <PersonIcon /> },
  { href: '/admin', labelKey: 'admin', icon: <ShieldIcon />, roles: ['MODERATOR', 'ADMIN'] },
];

export function Sidebar() {
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useSession();
  const { collapsed, toggle } = useSidebarState();
  const [open, setOpen] = useState(false); // Mobile-Toggle

  // Gaeste sehen die Sidebar ueberhaupt nicht
  if (loading) return null;
  if (!user) return null;

  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role));

  const handleLogout = async () => {
    await logout();
    router.push('/');
    router.refresh();
  };

  // Breite der permanenten (Desktop-)Sidebar abhaengig vom Zustand
  const width = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  const drawerContent = (mini: boolean) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflowX: 'hidden' }}>
      {/* Logo */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: mini ? 2 : 2.5, height: 64, flexShrink: 0 }}>
        <Box
          component="a"
          href="/"
          sx={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              px: 1,
              py: 0.5,
              borderRadius: 1.5,
              whiteSpace: 'nowrap',
            }}
          >
            {mini ? 'ER' : 'EduRepo'}
          </Typography>
        </Box>
      </Box>
      <Divider />

      {/* Navigation */}
      <List sx={{ flex: 1, px: 1, py: 1.5, overflowY: 'auto' }}>
        {items.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + '/');
          const button = (
            <ListItemButton
              selected={active}
              onClick={() => {
                setOpen(false);
                router.push(item.href);
              }}
              sx={{
                borderRadius: 1.5,
                mb: 0.25,
                justifyContent: mini ? 'center' : 'flex-start',
                px: mini ? 1.5 : 2,
              }}
            >
              <ListItemIcon sx={{ minWidth: mini ? 0 : 36, justifyContent: 'center' }}>{item.icon}</ListItemIcon>
              {!mini && (
                <ListItemText
                  primary={t(item.labelKey)}
                  primaryTypographyProps={{ fontWeight: active ? 600 : 500 }}
                />
              )}
            </ListItemButton>
          );
          // Mini-Modus: Label als Tooltip anzeigen
          return mini ? (
            <Tooltip key={item.href} title={t(item.labelKey)} placement="right" disableInteractive>
              <Box sx={{ display: 'flex' }}>{button}</Box>
            </Tooltip>
          ) : (
            <Box key={item.href}>{button}</Box>
          );
        })}
      </List>

      {/* Nutzer-Bereich unten */}
      <Box sx={{ p: 1, flexShrink: 0 }}>
        <Divider sx={{ mb: 1 }} />
        {mini ? (
          // Mini: nur Avatar + Logout-Icon untereinander
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title={`${user.displayName} (${user.role})`} placement="right" disableInteractive>
              <Box sx={{ display: 'flex', p: 0.5 }}>
                <Avatar avatarUrl={user.avatarUrl} name={user.displayName || user.email} size={32} />
              </Box>
            </Tooltip>
            <Tooltip title={tCommon('logout')} placement="right" disableInteractive>
              <IconButton size="small" onClick={handleLogout} aria-label={tCommon('logout')}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1, py: 1 }}>
              {/* Avatar mit Standard-Profilbild, wenn keines hochgeladen wurde */}
              <Avatar avatarUrl={user.avatarUrl} name={user.displayName || user.email} size={36} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.displayName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user.role}
                </Typography>
              </Box>
            </Box>
            <ListItemButton onClick={handleLogout} sx={{ borderRadius: 1.5, mt: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary={tCommon('logout')} />
            </ListItemButton>
          </>
        )}
      </Box>
    </Box>
  );

  return (
    <Box component="nav">
      {/* Mobile: Toggle-Button */}
      <IconButton
        onClick={() => setOpen(!open)}
        color="primary"
        aria-label="Menu"
        sx={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          boxShadow: 3,
          '&:hover': { bgcolor: 'primary.dark' },
          display: { xs: 'inline-flex', md: 'none' },
        }}
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </IconButton>

      {/* Permanent auf Desktop – voll oder minimiert */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width,
          flexShrink: 0,
          transition: (theme) => theme.transitions.create('width', { duration: theme.transitions.duration.shortest }),
          '& .MuiDrawer-paper': {
            width,
            boxSizing: 'border-box',
            borderRight: 1,
            borderColor: 'divider',
            overflowX: 'hidden',
            transition: (theme) => theme.transitions.create('width', { duration: theme.transitions.duration.shortest }),
          },
        }}
        open
      >
        {drawerContent(collapsed)}
      </Drawer>

      {/* Temporaer auf Mobile (immer volle Breite) */}
      <Drawer
        variant="temporary"
        open={open}
        onClose={() => setOpen(false)}
        ModalProps={{ keepMounted: true }} // bessere Performance auf Mobile
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: EXPANDED_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawerContent(false)}
      </Drawer>
    </Box>
  );
}