import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  // Transpile packages from the monorepo workspace
  transpilePackages: ['@nexaai/shared'],

  // Turbopack root — required in monorepos where the git root differs
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Experimental features
  experimental: {
    // Optimized CSS (optional — comment out if it causes issues)
    // optimizeCss: true,
  },
}

export default nextConfig
