import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '../../i18n/request';
import { ThemeProvider } from '../../components/ThemeProvider';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { SessionProvider } from '../../components/SessionProvider';
import { SidebarStateProvider } from '../../components/SidebarContext';
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
          <SidebarStateProvider>
            <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              <Header />
              <Box sx={{ display: 'flex', flex: 1, minHeight: 0, width: '100%' }}>
                {/* Sidebar nur fuer angemeldete Nutzer (rendert selbst null) */}
                <Sidebar />
                {/* Inhalt: nutzt den vollstaendig verfuegbaren Platz */}
                <SidebarAwareMain>{children}</SidebarAwareMain>
              </Box>
              <Footer />
            </Box>
          </SidebarStateProvider>
        </SessionProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}