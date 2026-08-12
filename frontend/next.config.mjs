import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // API-Aufrufe an das Backend im Dev-Modus (Ports siehe docker-compose).
  experimental: {
    // ggf. serverActions: true später
  },
};

export default withNextIntl(nextConfig);