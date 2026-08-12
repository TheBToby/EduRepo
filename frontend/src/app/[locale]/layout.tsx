import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Inter } from 'next/font/google';
import { locales } from '../../i18n/request';
import { ThemeProvider } from '../../components/ThemeProvider';
import { Header } from '../../components/Header';

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
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t border-[rgb(var(--border))] py-6 text-center text-xs text-[rgb(var(--foreground))]/60">
          © {new Date().getFullYear()} EduRepo – Education Repository
        </footer>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
