'use client';

// Passt das Layout des Hauptinhalts an die Sidebar an:
// Angemeldete Nutzer bekommen Platz fuer die Sidebar (md:pl-64),
// Gaeste erhalten das zentrierte Standard-Layout.
import { useSession } from './SessionProvider';

export function SidebarAwareMain({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  return (
    <main
      className={
        user
          ? 'min-h-[calc(100vh-8rem)] w-full flex-1 px-4 py-8 transition-[padding] md:pl-72 md:pr-8'
          : 'mx-auto min-h-[calc(100vh-8rem)] w-full max-w-6xl flex-1 px-4 py-8'
      }
    >
      {children}
    </main>
  );
}