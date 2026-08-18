'use client';

// Passt das Layout des Hauptinhalts an die Sidebar an:
// Die permanente Sidebar liegt selbst im Flex-Flow und belegt ihren Platz;
// der Hauptinhalt fuellt mit flex:1 exakt die restliche Breite aus – ohne
// zusaetzlichen Margin (kein doppeltes Einruecken, keine ungenutzte Flaeche).
// Beim Einklappen der Sidebar wird der Inhalt dadurch automatisch breiter.
import { Box } from '@mui/material';

export function SidebarAwareMain({ children }: { children: React.ReactNode }) {
  return (
    <Box
      component="main"
      sx={{
        // Fuellt den verbleibenden Platz neben der Sidebar vollstaendig aus
        flex: 1,
        width: 'auto',
        minWidth: 0, // erlaubt Schrumpfen im Flex-Row (z. B. bei Tabellen)
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        px: { xs: 2, sm: 3 },
        py: { xs: 2.5, md: 3 },
        overflowX: 'hidden',
      }}
    >
      {children}
    </Box>
  );
}
