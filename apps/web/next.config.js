/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@medical-inventory/shared-types',
    '@medical-inventory/constants',
    '@medical-inventory/shared-utils',
    '@medical-inventory/validation',
    'three',
  ],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'https://medical-inventiroy.onrender.com'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
