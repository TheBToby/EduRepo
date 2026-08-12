import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/request';

export default createMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: 'always',
});

export const config = {
  // Nur Pfade ohne explizite Dateien abfangen; /api/* und statische Assets ausnehmen.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};