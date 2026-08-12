import { useTranslations } from 'next-intl';
import { Link } from '../../../i18n/navigation';

export default function PendingPage() {
  const t = useTranslations('auth');
  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mb-4 text-4xl" aria-hidden>⏳</div>
      <h1 className="mb-2 text-2xl font-bold">{t('pendingTitle')}</h1>
      <p className="text-[rgb(var(--foreground))]/70">{t('pendingDesc')}</p>
      <p className="mt-6 text-sm">
        <Link href="/login" className="text-brand-600 hover:underline dark:text-brand-400">
          {t('loginTitle')}
        </Link>
      </p>
    </div>
  );
}