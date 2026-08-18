'use client';

// Passt das Layout des Hauptinhalts an die Sidebar an:
// Angemeldete Nutzer bekommen Platz fuer die (ggf. minimierte) Sidebar,
// Gaeste erhalten das zentrierte Standard-Layout. Der Inhalt nutzt die
// volle verfuegbare Breite/Route (kein zusaetzliches max-width-Limit,
// kein doppeltes Einruecken).
import { Box } from '@mui/material';
import { useSession } from './SessionProvider';
import { useSidebarState, EXPANDED_WIDTH, COLLAPSED_WIDTH } from './SidebarContext';

export function SidebarAwareMain({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const { collapsed } = useSidebarState();
  const drawerWidth = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  return (
    <Box
      component="main"
      sx={{
        // Volle verfuegbare Breite innerhalb des flexiblen Bereichs nutzen
        width: '100%',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        // Platz fuer die permanente Sidebar auf Desktop (md+)
        ml: user ? { md: `${drawerWidth}px` } : 0,
        px: { xs: 2, sm: 3 },
        py: { xs: 2.5, md: 3 },
        transition: (theme) =>
          theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.shortest,
          }),
        overflowX: 'hidden',
      }}
    >
      {children}
    </Box>
  );
}

/** Sidebar-Breiten fuer Layout-Berechnungen in anderen Komponenten. */
export const SIDEBAR_WIDTH = EXPANDED_WIDTH;