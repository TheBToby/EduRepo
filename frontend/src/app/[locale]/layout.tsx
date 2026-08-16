import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Inter } from 'next/font/google';
import { locales } from '../../i18n/request';
import { ThemeProvider } from '../../components/ThemeProvider';
import { Header } from '../../components/Header';
import { SessionProvider } from '../../components/SessionProvider';
import { Sidebar } from '../../components/Sidebar';
import { SidebarAwareMain } from '../../components/SidebarAwareMain';

// Die App ist durchgaengig dynamisch (Auth-Cookies, next-intl headers(),
// API-Daten via SSR). Statisches Rendering fuer [locale]-Routen daher
// explizit deaktivieren – sonst schlaegt `next build` fehl.
export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ['latin'] });

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
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <SessionProvider>
          <Header />
          <div className="flex">
            {/* Sidebar nur fuer angemeldete Nutzer (rendert selbst null) */}
            <Sidebar />
            {/* Inhalt: ohne Sidebar zentriert, mit Sidebar eingerueckt */}
            <SidebarAwareMain>{children}</SidebarAwareMain>
          </div>
          <footer className="border-t border-[rgb(var(--border))] py-6 text-center text-xs text-[rgb(var(--foreground))]/60">
            © {new Date().getFullYear()} EduRepo – Education Repository
          </footer>
        </SessionProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}