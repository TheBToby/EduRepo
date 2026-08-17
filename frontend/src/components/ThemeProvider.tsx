'use client';

// MUI-ThemeProvider fuer den Next.js App Router:
// - Robuster Emotion-Cache (SSR, RSC-kompatibel, kein FOUC)
// - Bruecke zu next-themes: resolvedTheme steuert den MUI-Modus (light/dark)
// - CssBaseline fuer einheitliche Basis-Styles
import * as React from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useTheme } from 'next-themes';
import { getTheme } from '../theme/theme';

/** MUI-Theme an next-themes koppeln (loest "system" zu light/dark auf). */
function MuiThemeBridge({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const muiTheme = React.useMemo(
    () => getTheme(resolvedTheme === 'dark' ? 'dark' : 'light'),
    [resolvedTheme],
  );
  return <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>;
}

/**
 * Kombinierter Provider: next-themes (Persistenz/systemweite Erkennung)
 * + Emotion-Cache fuer den App Router + MUI-Theme + CssBaseline.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ key: 'mui' }}>
      <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <MuiThemeBridge>
          <CssBaseline />
          {children}
        </MuiThemeBridge>
      </NextThemesProvider>
    </AppRouterCacheProvider>
  );
}