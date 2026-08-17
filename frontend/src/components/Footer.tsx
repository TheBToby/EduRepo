'use client';

// Fusszeile der Anwendung (MUI Paper mit Trennlinie).
import { Box, Typography } from '@mui/material';

export function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        borderTop: 1,
        borderColor: 'divider',
        py: 2.5,
        textAlign: 'center',
      }}
    >
      <Typography variant="caption" color="text.secondary">
        © {new Date().getFullYear()} EduRepo – Education Repository
      </Typography>
    </Box>
  );
}