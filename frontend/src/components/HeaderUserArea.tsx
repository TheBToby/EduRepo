'use client';

// Header-Bereich fuer den angemeldeten Nutzer: Avatar, Name und Abmelden.
// Gaeste sehen nichts (Login/Registrierung laeuft ueber die Landing Page).
import { Box, Button, Divider, Tooltip } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useTranslations } from 'next-intl';
import { useRouter } from '../i18n/navigation';
import { useSession } from './SessionProvider';
import { Avatar } from './Avatar';

export function HeaderUserArea() {
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { user, loading, logout } = useSession();

  if (loading) return null;
  if (!user) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 0.5, pl: 1.5, borderLeft: 1, borderColor: 'divider' }}>
      <Tooltip title={user.email}>
        <Button
          color="inherit"
          size="small"
          onClick={() => router.push('/profile')}
          startIcon={<Avatar avatarUrl={user.avatarUrl} name={user.displayName || user.email} size={24} />}
          sx={{ maxWidth: 220, textTransform: 'none' }}
        >
          <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: { xs: 'none', sm: 'inline' } }}>
            {user.displayName}
          </Box>
        </Button>
      </Tooltip>
      <Button
        color="inherit"
        size="small"
        onClick={async () => {
          await logout();
          router.push('/');
          router.refresh();
        }}
        endIcon={<LogoutIcon />}
        sx={{ textTransform: 'none' }}
      >
        {tCommon('logout')}
      </Button>
    </Box>
  );
}