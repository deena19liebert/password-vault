import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  eslint: {
    // Ignore ESLint errors during build for deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore TypeScript errors during build for deployment
    ignoreBuildErrors: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'bcryptjs']
  },
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    }
    
    config.resolve = config.resolve || {}
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }
    
    return config
  }
}

export default nextConfig