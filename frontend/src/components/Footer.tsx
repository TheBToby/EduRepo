'use client';

// Kompakte Fusszeile der Anwendung – einzeilig, damit der Hauptinhalt
// moeglichst viel Platz behaelt (Landing Page passt ohne Scroll).
import { Box, Typography } from '@mui/material';

export function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        borderTop: 1,
        borderColor: 'divider',
        py: 1,
        px: 2,
        textAlign: 'center',
        flexShrink: 0,
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
        © {new Date().getFullYear()} EduRepo – Education Repository
      </Typography>
    </Box>
  );
}