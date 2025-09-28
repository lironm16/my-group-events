/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n: {
    locales: ['he'],
    defaultLocale: 'he',
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.dicebear.com' },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

module.exports = nextConfig;

