'use client';

// Sprachumschalter als kompakte MUI ToggleButtonGroup (DE/FR/IT/EN).
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { locales } from '../i18n/request';
import { useTranslations } from 'next-intl';

const LABELS: Record<string, string> = {
  de: 'DE',
  fr: 'FR',
  it: 'IT',
  en: 'EN',
};

export function LanguageSwitcher() {
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname() || '/';

  const change = (next: string) => {
    if (next === locale) return;
    const segments = pathname.split('/');
    if (locales.includes(segments[1] as any)) {
      // Locale-Segment ersetzen
      segments[1] = next;
    } else {
      // Locale-Segment einfuegen
      segments.splice(1, 0, next);
    }
    router.push(segments.join('/') || `/${next}`);
  };

  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={locale}
      onChange={(_, next) => next && change(next)}
      aria-label={t('language')}
      sx={{ mr: 0.5 }}
    >
      {locales.map((l) => (
        <ToggleButton key={l} value={l} aria-label={l} sx={{ px: 1, py: 0.25, fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.4 }}>
          {LABELS[l]}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}