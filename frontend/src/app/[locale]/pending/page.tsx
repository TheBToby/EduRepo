import { useTranslations } from 'next-intl';
import { Box, Link as MuiLink, Typography } from '@mui/material';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { Link } from '../../../i18n/navigation';

export default function PendingPage() {
  const t = useTranslations('auth');
  return (
    <Box sx={{ maxWidth: 420, mx: 'auto', textAlign: 'center' }}>
      <Box sx={{ mb: 2, color: 'primary.main', display: 'flex', justifyContent: 'center' }}>
        <HourglassEmptyIcon sx={{ fontSize: 56 }} />
      </Box>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
        {t('pendingTitle')}
      </Typography>
      <Typography color="text.secondary">{t('pendingDesc')}</Typography>
      <Typography variant="body2" sx={{ mt: 3 }}>
        <MuiLink component={Link} href="/login" underline="hover">
          {t('loginTitle')}
        </MuiLink>
      </Typography>
    </Box>
  );
}