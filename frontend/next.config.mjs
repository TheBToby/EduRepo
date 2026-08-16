import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produktions-Build (Dockerfile, Stage "prod"): erzeugt .next/standalone mit
  // minimalem Server (server.js). Hat keinen Einfluss auf `next dev`.
  output: 'standalone',
  // API-Proxy: Der Browser ruft nur noch relative /api/*-Pfade auf, die der
  // Next.js-Server an das Backend weiterleitet. Dadurch funktioniert die App
  // über localhost, lokale IPs UND Reverse-Proxys (z. B. Coder-Workspace-URL)
  // ohne CORS- oder Mixed-Content-Probleme.
  async rewrites() {
    const backend = process.env.API_INTERNAL_URL || 'http://backend:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${backend}/:path*`,
      },
    ];
  },
  experimental: {
    // ggf. serverActions: true später
  },
};

export default withNextIntl(nextConfig);