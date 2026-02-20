/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.mux.com',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Agora SDK is browser-only — prevent SSR bundling errors
      config.externals.push('agora-rtc-sdk-ng')
    }
    return config
  },
}

module.exports = nextConfig
