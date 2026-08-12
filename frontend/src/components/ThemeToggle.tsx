'use client';

import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const t = useTranslations('common');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Hydration-Safe-Placeholder
    return <div className="h-9 w-9" />;
  }

  const cycle = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
  };

  const label = theme === 'light' ? t('light') : theme === 'dark' ? t('dark') : t('system');
  const icon = theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '🖥️';

  return (
    <button
      onClick={cycle}
      className="btn-secondary h-9 w-9 p-0"
      title={`${t('theme')}: ${label}`}
      aria-label={`${t('theme')}: ${label}`}
    >
      <span aria-hidden>{icon}</span>
    </button>
  );
}