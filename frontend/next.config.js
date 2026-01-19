/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['lh3.googleusercontent.com'], // For Google profile pictures
  },
  // Note: API URL is hardcoded in src/lib/api.ts for production
}

module.exports = nextConfig
