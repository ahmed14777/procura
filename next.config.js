/** @type {import('next').NextConfig} */
const nextConfig = {
  // Client-side only application
  output: 'export',
  // Disable server-side features
  images: {
    unoptimized: true
  }
};

module.exports = nextConfig;
