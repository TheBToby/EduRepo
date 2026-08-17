import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

// Inter als Variable einbinden, damit das MUI-Theme darauf zugreifen kann
// (siehe src/theme/theme.ts).
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'EduRepo – Education Repository',
  description: 'Austauschplattform für Schweizer Lehrpersonen',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={inter.variable}>{children}</body>
    </html>
  );
}