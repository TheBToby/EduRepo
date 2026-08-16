// next-intl: Server-seitige Konfiguration
import { getRequestConfig } from 'next-intl/server';

export const locales = ['de', 'fr', 'it', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'de';

export default getRequestConfig(async ({ requestLocale }) => {
  // next-intl >= 3.22: `requestLocale` (Promise) statt deprecated `locale`
  const requested = await requestLocale;
  const locale = locales.includes(requested as Locale)
    ? (requested as Locale)
    : defaultLocale;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
