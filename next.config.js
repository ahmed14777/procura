/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the default Next.js server output so API routes can process uploads.
  experimental: {
    serverComponentsExternalPackages: ["@vercel/blob", "undici"]
  },
  images: {
    unoptimized: true
  }
};

module.exports = nextConfig;
