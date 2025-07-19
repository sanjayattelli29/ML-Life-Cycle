/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'designwithsanjay.site',
      'lh3.googleusercontent.com',
      'avatars.githubusercontent.com',
      'res.cloudinary.com'
    ],
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
