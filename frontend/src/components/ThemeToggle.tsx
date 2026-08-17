'use client';

// Theme-Umschalter als MUI IconButton (Licht → Dunkel → System).
import { IconButton } from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const t = useTranslations('common');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Hydration-Safe-Placeholder (gleiche Groesse wie der Button)
    return <IconButton disabled size="small" aria-label={t('theme')} />;
  }

  const cycle = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
  };

  const label = theme === 'light' ? t('light') : theme === 'dark' ? t('dark') : t('system');
  const icon =
    theme === 'light' ? <LightModeIcon fontSize="small" /> :
    theme === 'dark' ? <DarkModeIcon fontSize="small" /> :
    <SettingsBrightnessIcon fontSize="small" />;

  return (
    <IconButton onClick={cycle} size="small" title={`${t('theme')}: ${label}`} aria-label={`${t('theme')}: ${label}`}>
      {icon}
    </IconButton>
  );
}