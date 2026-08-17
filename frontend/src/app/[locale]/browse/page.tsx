'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Box, Button, Card, CardActionArea, CardContent, Chip, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { api } from '../../../lib/api';
import { Link } from '../../../i18n/navigation';

type RepoListItem = {
  id: string;
  title: Record<string, string>;
  description: Record<string, string>;
  access: string;
  contentLanguage: string;
  owner: { displayName: string };
};

export default function BrowsePage() {
  const t = useTranslations('repo');
  const tCommon = useTranslations('common');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<RepoListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ items: RepoListItem[] }>('/repositories');
      setItems(res.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    search();
  }, []);

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <TextField
          placeholder={tCommon('search')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          sx={{ flexGrow: 1, minWidth: 240 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Button onClick={search} variant="contained" disabled={loading}>
          {loading ? tCommon('loading') : tCommon('search')}
        </Button>
      </Box>

      {loading ? (
        <Typography color="text.secondary">{tCommon('loading')}</Typography>
      ) : items.length === 0 ? (
        <Typography color="text.secondary">Keine Lehrmittel gefunden.</Typography>
      ) : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' } }}>
          {items.map((item) => (
            <Card key={item.id} variant="outlined" sx={{ height: '100%' }}>
              <CardActionArea
                component={Link}
                href={`/repositories/${item.id}`}
                sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
              >
                <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    {item.title.de || item.title.en || '—'}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {item.description.de || item.description.en || ''}
                  </Typography>
                  <Box sx={{ mt: 'auto' }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
                      <Chip label={item.contentLanguage} size="small" />
                      <Chip
                        label={item.access === 'PUBLIC_DOWNLOAD' ? t('publicDownload') : t('approvalRequired')}
                        size="small"
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      von {item.owner.displayName}
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}
    </Stack>
  );
}