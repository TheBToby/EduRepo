'use client';

// Header-Bereich fuer den angemeldeten Nutzer: Avatar und Name (klickbar
// -> Profil). Das Abmelden erfolgt ueber die Sidebar (dort gibt es den
// dedizierten Logout-Button), daher bewusst ohne eigenen Logout hier.
import { Box, Button, Tooltip } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useRouter } from '../i18n/navigation';
import { useSession } from './SessionProvider';
import { Avatar } from './Avatar';

export function HeaderUserArea() {
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { user, loading } = useSession();

  if (loading) return null;
  if (!user) return null;

  return (
    <Tooltip title={user.email}>
      <Button
        color="inherit"
        size="small"
        onClick={() => router.push('/profile')}
        startIcon={<Avatar avatarUrl={user.avatarUrl} name={user.displayName || user.email} size={24} />}
        sx={{
          maxWidth: 220,
          textTransform: 'none',
          fontWeight: 600,
          px: 1,
        }}
      >
        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: { xs: 'none', sm: 'inline' } }}>
          {user.displayName}
        </Box>
      </Button>
    </Tooltip>
  );
}