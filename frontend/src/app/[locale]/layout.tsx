import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '../../i18n/request';
import { ThemeProvider } from '../../components/ThemeProvider';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { SessionProvider } from '../../components/SessionProvider';
import { Sidebar } from '../../components/Sidebar';
import { SidebarAwareMain } from '../../components/SidebarAwareMain';
import { Box } from '@mui/material';

// Die App ist durchgaengig dynamisch (Auth-Cookies, next-intl headers(),
// API-Daten via SSR). Statisches Rendering fuer [locale]-Routen daher
// explizit deaktivieren – sonst schlaegt `next build` fehl.
export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale as any)) notFound();
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ThemeProvider>
        <SessionProvider>
          <Header />
          <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
            {/* Sidebar nur fuer angemeldete Nutzer (rendert selbst null) */}
            <Sidebar />
            {/* Inhalt: ohne Sidebar zentriert, mit Sidebar eingerueckt */}
            <SidebarAwareMain>{children}</SidebarAwareMain>
          </Box>
          <Footer />
        </SessionProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}