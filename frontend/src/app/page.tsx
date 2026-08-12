import { redirect } from 'next/navigation';
import { defaultLocale } from '../i18n/request';

// Die Root-Route leitet zur Standard-Locale weiter. next-intl-middleware übernimmt
// normalerweise das Routing; diese Seite dient als Fallback.
export default function RootPage() {
  redirect(`/${defaultLocale}`);
}