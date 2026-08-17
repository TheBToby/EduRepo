'use client';

// Passt das Layout des Hauptinhalts an die Sidebar an:
// Angemeldete Nutzer bekommen Platz fuer die Sidebar (links eingerueckt,
// md = Desktop), Gaeste erhalten das zentrierte Standard-Layout.
import { Box } from '@mui/material';
import { useSession } from './SessionProvider';

const DRAWER_WIDTH = 256;

export function SidebarAwareMain({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  return (
    <Box
      component="main"
      sx={
        user
          ? {
              width: '100%',
              flex: 1,
              minHeight: 'calc(100vh - 8rem)',
              // Platz fuer die permanente Sidebar auf Desktop (md+)
              ml: { md: `${DRAWER_WIDTH}px` },
              px: { xs: 2, sm: 3 },
              py: { xs: 3, md: 4 },
              transition: 'margin 0.2s ease',
            }
          : {
              width: '100%',
              flex: 1,
              minHeight: 'calc(100vh - 8rem)',
              maxWidth: 1152, // wie bisher max-w-6xl
              mx: 'auto',
              px: { xs: 2, sm: 3 },
              py: { xs: 3, md: 4 },
            }
      }
    >
      {children}
    </Box>
  );
}

/** Sidebar-Breite fuer Layout-Berechnungen in anderen Komponenten. */
export const SIDEBAR_WIDTH = DRAWER_WIDTH;