import { useTranslations } from 'next-intl';
import { Link } from '../../i18n/navigation';

export default function LandingPage() {
  const t = useTranslations('landing');

  const features = [
    { icon: '📚', title: t('featureReposTitle'), desc: t('featureReposDesc') },
    { icon: '🔒', title: t('featureSecureTitle'), desc: t('featureSecureDesc') },
    { icon: '🎯', title: t('featureCurriculumTitle'), desc: t('featureCurriculumDesc') },
    { icon: '⭐', title: t('featureRatingTitle'), desc: t('featureRatingDesc') },
  ];

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          {t('heroTitle')}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-[rgb(var(--foreground))]/70">
          {t('heroSubtitle')}
        </p>
        <p className="mt-3 text-sm font-medium text-brand-600 dark:text-brand-400">
          {t('forTeachers')}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/register" className="btn-primary">
            {t('ctaRegister')}
          </Link>
          <Link href="/login" className="btn-secondary">
            {t('ctaLogin')}
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="card">
            <div className="mb-3 text-3xl" aria-hidden>
              {f.icon}
            </div>
            <h3 className="mb-2 font-semibold">{f.title}</h3>
            <p className="text-sm text-[rgb(var(--foreground))]/70">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Hinweis nur Lehrpersonen */}
      <section className="card border-brand-500/30 bg-brand-50/50 dark:bg-brand-900/10">
        <p className="text-sm">{t('infoOnlyTeachers')}</p>
      </section>
    </div>
  );
}