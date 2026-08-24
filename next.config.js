/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the default Next.js server output so API routes can process uploads.
  serverExternalPackages: ["@vercel/blob", "undici"],
  /* turbopack: {
    root: __dirname
  },
  */ images: {
    unoptimized: true
  }
};

module.exports = nextConfig;
