/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configure for both web and electron builds
  output: process.env.BUILD_MODE === 'electron' ? 'export' : undefined,
  trailingSlash: process.env.BUILD_MODE === 'electron' ? true : false,
  distDir: process.env.BUILD_MODE === 'electron' ? 'out' : '.next',
  images: {
    domains: [
      'designwithsanjay.site',
      'lh3.googleusercontent.com',
      'avatars.githubusercontent.com',
      'res.cloudinary.com'
    ],
    // For static export, we need to disable image optimization
    unoptimized: process.env.BUILD_MODE === 'electron' ? true : false,
  },
  // Use the correct configuration for Next.js 15+
  transpilePackages: ['mongoose'],
  // Disable ESLint during builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable TypeScript type checking during builds
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
