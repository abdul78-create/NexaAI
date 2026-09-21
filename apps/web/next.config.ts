import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  // Production output for Docker containerization
  output: 'standalone',

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

  // Reverse proxy rewrites for /api/v1 API endpoints
  async rewrites() {
    const rawBackend =
      process.env.INTERNAL_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'https://nexaai-backend-4uqm.onrender.com'
    const backendOrigin = rawBackend.trim().replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '')

    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendOrigin}/api/v1/:path*`,
      },
    ]
  },
}

export default nextConfig
