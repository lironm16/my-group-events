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
  },
};

module.exports = nextConfig;

