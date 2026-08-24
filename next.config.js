/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the default Next.js server output so API routes can process uploads.
  serverExternalPackages: ['@vercel/blob', 'undici'],
  allowedDevOrigins: ['192.168.1.23'],
  /* turbopack: {
    root: __dirname
  },
  */ images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
