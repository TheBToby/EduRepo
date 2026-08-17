import { createTheme } from '@mui/material/styles';

// Zentrales MUI-Theme fuer EduRepo (Licht + Dunkel).
// Die Markenfarben entsprechen der bisherigen "brand"-Palette (Blauton),
// Grautone orientieren sich an Slate (wie bisherige CSS-Variablen).

const brand = {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#3b82f6',
  600: '#2563eb',
  700: '#1d4ed8',
  800: '#1e40af',
  900: '#1e3a8a',
};

const fontFamily = "var(--font-inter), 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

// Gemeinsame Komponenten-Defaults fuer beide Modi
const sharedComponents = {
  MuiButton: {
    defaultProps: {
      disableElevation: true,
    },
    styleOverrides: {
      root: {
        textTransform: 'none',
        borderRadius: 8,
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 12,
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none', // kein Gradient wie bei MUI-Default in dunklen Themes
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 6,
      },
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: 8,
      },
    },
  },
  MuiTooltip: {
    defaultProps: {
      arrow: true,
    },
  },
};

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: brand[600], contrastText: '#ffffff' },
    secondary: { main: '#7c3aed' },
    background: { default: '#f8fafc', paper: '#ffffff' },
    divider: '#e2e8f0',
    text: { primary: '#0f172a', secondary: '#475569' },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily,
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    button: { fontWeight: 600 },
  },
  components: sharedComponents,
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: brand[400] },
    secondary: { main: '#a78bfa' },
    background: { default: '#0f172a', paper: '#1e293b' },
    divider: '#334155',
    text: { primary: '#e2e8f0', secondary: '#94a3b8' },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily,
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    button: { fontWeight: 600 },
  },
  components: sharedComponents,
});

export function getTheme(mode: 'light' | 'dark') {
  return mode === 'dark' ? darkTheme : lightTheme;
}