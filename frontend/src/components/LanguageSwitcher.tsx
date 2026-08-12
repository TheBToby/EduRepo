'use client';

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
      segments[1] = next;
    } else {
      segments.splice(1, 0, next);
    }
    router.push(segments.join('/') || `/${next}`);
  };

  return (
    <div className="flex items-center gap-1" title={t('language')} aria-label={t('language')}>
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => change(l)}
          className={`rounded px-2 py-1 text-xs font-semibold transition-colors ${
            l === locale ? 'bg-brand-600 text-white' : 'hover:bg-[rgb(var(--muted))]'
          }`}
          aria-pressed={l === locale}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}