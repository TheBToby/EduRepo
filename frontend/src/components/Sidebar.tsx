'use client';

// Moderne Sidebar-Navigation (MUI Drawer): nur fuer angemeldete Nutzer
// sichtbar. Zeigt ausschliesslich die Features, die fuer Rolle/Profil
// verfuegbar sind. Permanent auf Desktop, temporär auf Mobile.
import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '../i18n/navigation';
import { useSession } from './SessionProvider';
import { Avatar } from './Avatar';
import { Box, Chip, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
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
  icon: ReactNode;
  roles?: Array<'USER' | 'MODERATOR' | 'ADMIN'>; // undefined = alle angemeldeten Nutzer
};

const DRAWER_WIDTH = 256;

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

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, height: 64, flexShrink: 0 }}>
        <Box
          component="a"
          href="/"
          sx={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 1.5 }}
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
        </Box>
      </Box>
      <Divider />

      {/* Navigation */}
      <List sx={{ flex: 1, px: 1.5, py: 1.5, overflowY: 'auto' }}>
        {items.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <ListItemButton
              key={item.href}
              selected={active}
              onClick={() => {
                setOpen(false);
                router.push(item.href);
              }}
              sx={{ borderRadius: 1.5, mb: 0.25, '&.Mui-selected': { fontWeight: 600 } }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={t(item.labelKey)} primaryTypographyProps={{ fontWeight: active ? 600 : 500 }} />
            </ListItemButton>
          );
        })}
      </List>

      {/* Nutzer-Bereich unten */}
      <Box sx={{ p: 1.5, flexShrink: 0 }}>
        <Divider sx={{ mb: 1.5 }} />
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

      {/* Permanent auf Desktop */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: 1,
            borderColor: 'divider',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>

      {/* Temporaer auf Mobile */}
      <Drawer
        variant="temporary"
        open={open}
        onClose={() => setOpen(false)}
        ModalProps={{ keepMounted: true }} // bessere Performance auf Mobile
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}
